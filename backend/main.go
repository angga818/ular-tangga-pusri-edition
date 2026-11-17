package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"ular-tangga-pusri-backend/config"
	"ular-tangga-pusri-backend/database"
	"ular-tangga-pusri-backend/handlers"
	"ular-tangga-pusri-backend/models"
	"ular-tangga-pusri-backend/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		// Client non-browser (mis. health check/script) tidak mengirim Origin.
		if origin == "" {
			return true
		}
		u, err := url.Parse(origin)
		if err != nil || u.Host == "" {
			return false
		}
		// Izinkan same-origin dan localhost untuk development.
		if u.Host == r.Host {
			return true
		}
		host := u.Hostname()
		return host == "localhost" || host == "127.0.0.1" || host == "::1"
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func main() {
	// Setup logger
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339})

	// Load config
	cfg := config.Load()

	// Connect to database
	if err := database.Connect(cfg); err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer database.Close()

	// Run migrations
	if err := database.RunMigrations(); err != nil {
		log.Fatal().Err(err).Msg("Failed to run migrations")
	}

	// Seed referensi (peta & karakter) dan bank soal
	if err := database.SeedMapsAndCharacters(); err != nil {
		log.Error().Err(err).Msg("Failed to seed maps and characters")
	}
	if err := database.SeedQuestions(); err != nil {
		log.Error().Err(err).Msg("Failed to seed questions")
	}

	// Create WebSocket hub
	hub := websocket.NewHub()

	// Create handlers
	roomHandler := handlers.NewRoomHandler(hub)
	gameHandler := handlers.NewGameHandler(hub)
	// Host memulai game (RoomHandler), bot dijalankan GameHandler saat giliran
	// pertama dibuka. Tidak ada import cycle: memakai callback fungsi.
	roomHandler.SetOnTurnStarted(gameHandler.MaybeTriggerBotTurn)

	// HTTP server
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// WebSocket endpoint
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Error().Err(err).Msg("WebSocket upgrade failed")
			return
		}

		client := &websocket.Client{
			Hub:      hub,
			Conn:     conn,
			Send:     make(chan []byte, 256),
			RoomCode: "",
		}

		hub.Register <- client

		go client.WritePump()
		go client.ReadPump(hub)
	})

	// Message handler
	hub.HandleMessage = func(client *websocket.Client, message []byte) {
		var msg struct {
			Type    string          `json:"type"`
			Payload json.RawMessage `json:"payload"`
		}
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Error().Err(err).Msg("Failed to unmarshal message")
			return
		}

		switch msg.Type {
		// Room management
		case "CREATE_ROOM":
			var payload models.CreateRoomPayload
			json.Unmarshal(msg.Payload, &payload)
			roomHandler.HandleCreateRoom(client, payload)

		case "JOIN_ROOM":
			var payload models.JoinRoomPayload
			json.Unmarshal(msg.Payload, &payload)
			roomHandler.HandleJoinRoom(client, payload)

		case "SPECTATE_ROOM":
			var payload models.SpectateRoomPayload
			json.Unmarshal(msg.Payload, &payload)
			roomHandler.HandleSpectateRoom(client, payload)

		case "SET_READY":
			var payload models.SetReadyPayload
			json.Unmarshal(msg.Payload, &payload)
			roomHandler.HandleSetReady(client, payload)

		case "START_GAME":
			var payload models.StartGamePayload
			json.Unmarshal(msg.Payload, &payload)
			roomHandler.HandleStartGame(client, payload)

		case "ADD_BOT":
			var payload models.AddBotPayload
			json.Unmarshal(msg.Payload, &payload)
			roomHandler.HandleAddBot(client, payload)

		case "CHANGE_MAP":
			var payload models.ChangeMapPayload
			json.Unmarshal(msg.Payload, &payload)
			roomHandler.HandleChangeMap(client, payload)

		case "LEAVE_ROOM":
			var payload models.LeaveRoomPayload
			json.Unmarshal(msg.Payload, &payload)
			roomHandler.HandleLeaveRoom(client, payload)

		// Game actions
		case "ROLL_DICE":
			var payload models.RollDicePayload
			json.Unmarshal(msg.Payload, &payload)
			gameHandler.HandleRollDice(client, payload)

		case "SUBMIT_ANSWER":
			var payload models.SubmitAnswerPayload
			json.Unmarshal(msg.Payload, &payload)
			gameHandler.HandleSubmitAnswer(client, payload)

		// Ping/Pong
		case "PING":
			hub.SendToClient(client, models.NewMessage("PONG", models.PongPayload{Timestamp: time.Now().UnixMilli()}))

		default:
			log.Warn().Str("type", msg.Type).Msg("Unknown message type")
		}
	}

	// Hub mulai berjalan setelah semua handler & callback terpasang.
	go hub.Run(context.Background())

	server := &http.Server{
		Addr:         cfg.Server.Host + ":" + cfg.Server.Port,
		Handler:      mux,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Start server
	go func() {
		log.Info().Str("addr", server.Addr).Msg("Server starting")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("Server failed")
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatal().Err(err).Msg("Server forced to shutdown")
	}

	log.Info().Msg("Server exited")
}