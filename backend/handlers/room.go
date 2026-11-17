package handlers

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"ular-tangga-pusri-backend/database"
	"ular-tangga-pusri-backend/models"
	"ular-tangga-pusri-backend/websocket"
)

type RoomHandler struct {
	hub           *websocket.Hub
	onTurnStarted func(roomCode string)
}

func NewRoomHandler(hub *websocket.Hub) *RoomHandler {
	return &RoomHandler{hub: hub}
}

// SetOnTurnStarted dipanggil dari main.go supaya RoomHandler bisa memberi
// tahu GameHandler bahwa bot perlu mengambil giliran (tanpa import cycle).
func (h *RoomHandler) SetOnTurnStarted(fn func(roomCode string)) {
	h.onTurnStarted = fn
}

// isHost mengecek apakah client yang terhubung adalah pembuat room.
// Host dibuat sebagai spectator, jadi tidak boleh mengandalkan !IsSpectator.
func isHost(client *websocket.Client, room *models.Room) bool {
	if client == nil || room == nil {
		return false
	}
	return client.HostToken != "" && client.HostToken == room.HostToken
}

func (h *RoomHandler) HandleCreateRoom(client *websocket.Client, payload models.CreateRoomPayload) {
	// Validate
	if strings.TrimSpace(payload.RoomName) == "" {
		h.sendError(client, "INVALID_NAME", "Nama room wajib diisi.")
		return
	}
	hostNickname := strings.TrimSpace(payload.HostNickname)
	if hostNickname == "" || len(hostNickname) > 20 {
		h.sendError(client, "INVALID_HOST", "Nama host wajib diisi (maksimal 20 karakter).")
		return
	}
	if payload.MaxPlayers < 2 || payload.MaxPlayers > 8 {
		h.sendError(client, "INVALID_PLAYERS", "Maksimal pemain harus antara 2 dan 8.")
		return
	}
	if payload.TurnTimeLimitSec < 5 || payload.TurnTimeLimitSec > 60 {
		h.sendError(client, "INVALID_TIME", "Durasi menjawab harus antara 5 dan 60 detik.")
		return
	}

	// Check map exists
	var mapExists bool
	err := database.Pool.QueryRow(context.Background(),
		"SELECT EXISTS(SELECT 1 FROM maps WHERE id = $1)", payload.MapID).Scan(&mapExists)
	if err != nil || !mapExists {
		h.sendError(client, "INVALID_MAP", "Tema peta tidak tersedia.")
		return
	}

	// Validate question source
	if payload.QuestionMode == "CUSTOM" {
		if payload.QuestionSetID == "" {
			h.sendError(client, "INVALID_SET", "Pilih Question Set untuk mode custom.")
			return
		}
		var setCount int
		err = database.Pool.QueryRow(context.Background(),
			"SELECT COUNT(*) FROM question_sets WHERE id = $1 AND array_length(question_ids, 1) > 0",
			payload.QuestionSetID).Scan(&setCount)
		if err != nil || setCount == 0 {
			h.sendError(client, "INVALID_SET", "Question Set tidak valid atau kosong.")
			return
		}
	} else {
		var questionCount int
		query := "SELECT COUNT(*) FROM questions WHERE is_active = true"
		args := []interface{}{}
		if len(payload.Categories) > 0 {
			placeholders := make([]string, len(payload.Categories))
			for i, cat := range payload.Categories {
				placeholders[i] = fmt.Sprintf("$%d", i+1)
				args = append(args, cat)
			}
			query += " AND category IN (" + strings.Join(placeholders, ",") + ")"
		}
		err = database.Pool.QueryRow(context.Background(), query, args...).Scan(&questionCount)
		if err != nil || questionCount < 3 {
			h.sendError(client, "NO_QUESTIONS", "Minimal tersedia 3 pertanyaan aktif pada kategori yang dipilih.")
			return
		}
	}

	// Generate unique 6-digit PIN
	var code string
	found := false
	for attempt := 0; attempt < 20; attempt++ {
		n, err := rand.Int(rand.Reader, big.NewInt(900000))
		if err != nil {
			h.sendError(client, "SERVER_ERROR", "Gagal membuat PIN room. Coba lagi.")
			return
		}
		candidate := fmt.Sprintf("%06d", n.Int64()+100000)
		var exists bool
		err = database.Pool.QueryRow(context.Background(),
			"SELECT EXISTS(SELECT 1 FROM rooms WHERE code = $1)", candidate).Scan(&exists)
		if err == nil && !exists {
			code = candidate
			found = true
			break
		}
	}
	if !found {
		h.sendError(client, "SERVER_ERROR", "Gagal membuat PIN room. Coba lagi.")
		return
	}

	roomID := uuid.New()
	hostToken := "host_" + uuid.New().String()
	now := time.Now()

	initialTurnState := models.TurnState{
		TurnNumber:       0,
		CurrentPlayerID:  "",
		DiceValue:        nil,
		AnimationSeed:    nil,
		ActiveQuestion:   nil,
		AnsweredOptionID: nil,
		LastAnswerResult: nil,
		LastMovement:     nil,
		UsedQuestionIDs:  []string{},
		TurnStartedAtMs:  0,
	}
	turnStateJSON, _ := json.Marshal(initialTurnState)

	categoriesJSON, _ := json.Marshal(payload.Categories)

	// Kolom UUID nullable tidak boleh diisi string kosong.
	var questionSetID any
	if payload.QuestionSetID != "" {
		questionSetID = payload.QuestionSetID
	}

	// Create room
	_, err = database.Pool.Exec(context.Background(), `
		INSERT INTO rooms (id, code, name, host_token, map_id, status, max_players, question_mode, question_set_id, categories, turn_time_limit_sec, current_turn, current_player_id, turn_state, spectator_ids, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
	`, roomID, code, payload.RoomName, hostToken, payload.MapID, "LOBBY", payload.MaxPlayers, payload.QuestionMode,
		questionSetID, categoriesJSON, payload.TurnTimeLimitSec, 0, nil, turnStateJSON, []uuid.UUID{}, now, now)

	if err != nil {
		log.Error().Err(err).Msg("Failed to create room")
		h.sendError(client, "SERVER_ERROR", "Gagal membuat room.")
		return
	}

	// Create host as spectator
	spectatorID := uuid.New()
	spectatorToken := "ptok_" + uuid.New().String()
	_, err = database.Pool.Exec(context.Background(), `
		INSERT INTO players (id, room_id, player_token, nickname, character_id, position, score, correct_answers, total_answer_time_ms, is_ready, is_connected, is_bot, is_spectator, joined_at)
		VALUES ($1, $2, $3, $4, $5, 1, 0, 0, 0, true, true, false, true, $6)
	`, spectatorID, roomID, spectatorToken, hostNickname, "character_01", now)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create host spectator")
		h.sendError(client, "SERVER_ERROR", "Gagal membuat sesi host.")
		return
	}

	// Update room with spectator
	_, _ = database.Pool.Exec(context.Background(),
		"UPDATE rooms SET spectator_ids = $1 WHERE id = $2",
		[]uuid.UUID{spectatorID}, roomID)

	// Set client auth
	client.Hub = h.hub
	client.RoomCode = code
	client.PlayerID = spectatorID.String()
	client.HostToken = hostToken
	client.Nickname = hostNickname
	client.IsSpectator = true
	h.hub.JoinRoom(client)

	// Get full room state
	room := h.getRoomState(code)
	players := h.getPlayers(roomID)
	spectators := h.getSpectators(roomID)

	// Send room state to client
	h.hub.SendToClient(client, models.NewMessage(models.MsgRoomState, models.RoomStatePayload{
		Room:       room,
		Players:    players,
		Spectators: spectators,
		// Host dibuat sebagai spectator, jadi cari di spectators.
		You:         h.findPlayer(spectators, spectatorID.String()),
		HostToken:   room.HostToken,
		PlayerToken: spectatorToken,
	}))

	// Broadcast to room (only host for now)
	h.broadcastRoomState(code)

	log.Info().Str("room", code).Str("host", spectatorID.String()).Msg("Room created")
}

func (h *RoomHandler) HandleJoinRoom(client *websocket.Client, payload models.JoinRoomPayload) {
	// Validate
	if len(payload.RoomCode) != 6 {
		h.sendError(client, "INVALID_CODE", "Kode PIN room harus terdiri dari 6 digit angka.")
		return
	}
	if len(payload.Nickname) < 1 || len(payload.Nickname) > 20 {
		h.sendError(client, "INVALID_NICKNAME", "Nickname wajib diisi (1–20 karakter).")
		return
	}

	// Get room
	room := h.getRoomState(payload.RoomCode)
	if room == nil {
		h.sendError(client, "NOT_FOUND", "Room dengan kode PIN tersebut tidak ditemukan.")
		return
	}
	if room.Status != "LOBBY" {
		h.sendError(client, "ROOM_ALREADY_STARTED", "Permainan di room ini sudah dimulai.")
		return
	}

	// Count players
	players := h.getPlayersByRoomCode(payload.RoomCode)
	if len(players) >= room.MaxPlayers {
		h.sendError(client, "ROOM_FULL", "Kapasitas room sudah penuh.")
		return
	}

	// Check nickname
	for _, p := range players {
		if strings.EqualFold(p.Nickname, payload.Nickname) {
			h.sendError(client, "NICKNAME_TAKEN", "Nickname sudah digunakan di room ini.")
			return
		}
	}

	// Validate character
	var charExists bool
	err := database.Pool.QueryRow(context.Background(),
		"SELECT EXISTS(SELECT 1 FROM characters WHERE id = $1)", payload.CharacterID).Scan(&charExists)
	if err != nil || !charExists {
		h.sendError(client, "INVALID_CHARACTER", "Karakter yang dipilih tidak valid.")
		return
	}

	roomID := room.ID
	playerID := uuid.New()
	playerToken := "ptok_" + uuid.New().String()
	now := time.Now()

	// Create player
	_, err = database.Pool.Exec(context.Background(), `
		INSERT INTO players (id, room_id, player_token, nickname, character_id, position, score, correct_answers, total_answer_time_ms, is_ready, is_connected, is_bot, is_spectator, joined_at)
		VALUES ($1, $2, $3, $4, $5, 1, 0, 0, 0, false, true, false, false, $6)
	`, playerID, roomID, playerToken, payload.Nickname, payload.CharacterID, now)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create player")
		h.sendError(client, "SERVER_ERROR", "Gagal bergabung ke room.")
		return
	}

	// Set client auth
	client.Hub = h.hub
	client.RoomCode = payload.RoomCode
	client.PlayerID = playerID.String()
	client.Nickname = payload.Nickname
	client.IsSpectator = false
	h.hub.JoinRoom(client)

	// Get updated state
	players = h.getPlayersByRoomCode(payload.RoomCode)
	spectators := h.getSpectatorsByRoomCode(payload.RoomCode)
	room = h.getRoomState(payload.RoomCode)

	// Send room state to joining player
	h.hub.SendToClient(client, models.NewMessage(models.MsgRoomState, models.RoomStatePayload{
		Room:       room,
		Players:    players,
		Spectators:  spectators,
		You:         h.findPlayer(players, playerID.String()),
		PlayerToken: playerToken,
	}))

	// Notify others
	h.hub.BroadcastToRoom(payload.RoomCode, models.NewMessage(models.MsgPlayerJoined, models.PlayerJoinedPayload{
		RoomCode: payload.RoomCode,
		Player:   h.findPlayer(players, playerID.String()),
	}))

	log.Info().Str("room", payload.RoomCode).Str("player", playerID.String()).Msg("Player joined room")
}

func (h *RoomHandler) HandleSpectateRoom(client *websocket.Client, payload models.SpectateRoomPayload) {
	room := h.getRoomState(payload.RoomCode)
	if room == nil {
		h.sendError(client, "NOT_FOUND", "Room tidak ditemukan.")
		return
	}

	nickname := payload.Nickname
	if nickname == "" {
		nickname = "Pengamat"
	}

	spectatorID := uuid.New()
	spectatorToken := "ptok_" + uuid.New().String()
	now := time.Now()

	_, err := database.Pool.Exec(context.Background(), `
		INSERT INTO players (id, room_id, player_token, nickname, character_id, position, score, correct_answers, total_answer_time_ms, is_ready, is_connected, is_bot, is_spectator, joined_at)
		VALUES ($1, $2, $3, $4, $5, 1, 0, 0, 0, true, true, false, true, $6)
	`, spectatorID, room.ID, spectatorToken, nickname, "character_01", now)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create spectator")
		h.sendError(client, "SERVER_ERROR", "Gagal bergabung sebagai pengamat.")
		return
	}

	// Update room spectator_ids
	_, _ = database.Pool.Exec(context.Background(),
		"UPDATE rooms SET spectator_ids = array_append(spectator_ids, $1) WHERE id = $2 AND NOT $1 = ANY(spectator_ids)",
		spectatorID, room.ID)

	client.Hub = h.hub
	client.RoomCode = payload.RoomCode
	client.PlayerID = spectatorID.String()
	client.Nickname = nickname
	client.IsSpectator = true
	// Host bergabung kembali sebagai pengamat perlu tetap dikenali sebagai host
	// supaya ADD_BOT / CHANGE_MAP / LEAVE_ROOM tetap bisa dipanggil.
	if payload.HostToken != "" && payload.HostToken == room.HostToken {
		client.HostToken = room.HostToken
	}
	h.hub.JoinRoom(client)

	players := h.getPlayersByRoomCode(payload.RoomCode)
	spectators := h.getSpectatorsByRoomCode(payload.RoomCode)
	room = h.getRoomState(payload.RoomCode)

	h.hub.SendToClient(client, models.NewMessage(models.MsgRoomState, models.RoomStatePayload{
		Room:       room,
		Players:    players,
		Spectators:  spectators,
		You:         h.findPlayer(spectators, spectatorID.String()),
		PlayerToken: spectatorToken,
	}))

	h.broadcastRoomState(payload.RoomCode)
	log.Info().Str("room", payload.RoomCode).Str("spectator", spectatorID.String()).Msg("Spectator joined")
}

func (h *RoomHandler) HandleSetReady(client *websocket.Client, payload models.SetReadyPayload) {
	if client.RoomCode == "" || client.PlayerID == "" {
		return
	}

	_, err := database.Pool.Exec(context.Background(),
		"UPDATE players SET is_ready = $1 WHERE id = $2 AND room_id = (SELECT id FROM rooms WHERE code = $3)",
		payload.Ready, client.PlayerID, client.RoomCode)
	if err != nil {
		return
	}

	// Notify room
	h.hub.BroadcastToRoom(client.RoomCode, models.NewMessage(models.MsgPlayerReadyUpdate, models.PlayerReadyUpdatePayload{
		RoomCode: client.RoomCode,
		PlayerID: client.PlayerID,
		Ready:    payload.Ready,
	}))

	// Refresh and broadcast
	h.broadcastRoomState(client.RoomCode)
}

func (h *RoomHandler) HandleStartGame(client *websocket.Client, payload models.StartGamePayload) {
	if client.RoomCode == "" {
		return
	}

	room := h.getRoomState(client.RoomCode)
	if room == nil {
		h.sendError(client, "NOT_FOUND", "Room tidak ditemukan.")
		return
	}
	// Host adalah spectator — jangan tolak spectator di sini.
	authorized := isHost(client, room) ||
		(client.IsSpectator && payload.HostToken != "" && payload.HostToken == room.HostToken)
	if !authorized {
		h.sendError(client, "UNAUTHORIZED", "Hanya host yang dapat memulai.")
		return
	}
	if room.Status != "LOBBY" {
		h.sendError(client, "INVALID_STATE", "Permainan sudah berlangsung.")
		return
	}

	players := h.getPlayersByRoomCode(client.RoomCode)
	if len(players) < 2 {
		h.sendError(client, "NOT_ENOUGH_PLAYERS", "Minimal 2 pemain harus bergabung untuk memulai permainan.")
		return
	}
	for _, p := range players {
		if !p.IsReady {
			h.sendError(client, "NOT_ALL_READY", "Semua pemain harus berstatus Siap (Ready) terlebih dahulu.")
			return
		}
	}

	// Initialize game
	firstPlayer := players[0]
	now := time.Now()

	turnState := models.TurnState{
		TurnNumber:       1,
		CurrentPlayerID:  firstPlayer.ID,
		DiceValue:        nil,
		AnimationSeed:    nil,
		ActiveQuestion:   nil,
		AnsweredOptionID: nil,
		LastAnswerResult: nil,
		LastMovement:     nil,
		UsedQuestionIDs:  []string{},
		TurnStartedAtMs:  now.UnixMilli(),
	}
	turnStateJSON, _ := json.Marshal(turnState)

	_, err := database.Pool.Exec(context.Background(), `
		UPDATE rooms SET status = $1, current_turn = $2, current_player_id = $3, turn_state = $4, updated_at = $5 WHERE code = $6
	`, "STARTING", 1, firstPlayer.ID, turnStateJSON, now, client.RoomCode)
	if err != nil {
		log.Error().Err(err).Msg("Failed to start game")
		return
	}

	// Broadcast GAME_STARTED
	h.hub.BroadcastToRoom(client.RoomCode, models.NewMessage(models.MsgGameStarted, models.GameStartedPayload{
		RoomCode: client.RoomCode,
	}))

	// After delay, start first turn
	go func() {
		time.Sleep(700 * time.Millisecond)
		h.startTurn(client.RoomCode, firstPlayer.ID)
	}()

	log.Info().Str("room", client.RoomCode).Msg("Game started")
}

func (h *RoomHandler) HandleAddBot(client *websocket.Client, _ models.AddBotPayload) {
	if client.RoomCode == "" {
		return
	}

	room := h.getRoomState(client.RoomCode)
	if room == nil || room.Status != "LOBBY" || !isHost(client, room) {
		return
	}

	players := h.getPlayersByRoomCode(client.RoomCode)
	if len(players) >= room.MaxPlayers {
		return
	}

	botNames := []string{"Budi (Bot)", "Sinta (Bot)", "Andi (Bot)", "Dewi (Bot)", "Fajar (Bot)", "Tari (Bot)", "Hendra (Bot)"}
	usedNames := make(map[string]bool)
	for _, p := range players {
		usedNames[strings.ToLower(p.Nickname)] = true
	}

	var botName string
	for _, name := range botNames {
		if !usedNames[strings.ToLower(name)] {
			botName = name
			break
		}
	}
	if botName == "" {
		botName = fmt.Sprintf("Rekan %d (Bot)", len(players)+1)
	}

	usedChars := make(map[string]bool)
	for _, p := range players {
		usedChars[p.CharacterID] = true
	}
	var charID string
	chars := []string{"character_01", "character_02", "character_03", "character_04", "character_05", "character_06", "character_07"}
	for _, c := range chars {
		if !usedChars[c] {
			charID = c
			break
		}
	}
	if charID == "" {
		charID = chars[len(players)%len(chars)]
	}

	botID := uuid.New()
	botToken := "ptok_" + uuid.New().String()
	now := time.Now()

	_, err := database.Pool.Exec(context.Background(), `
		INSERT INTO players (id, room_id, player_token, nickname, character_id, position, score, correct_answers, total_answer_time_ms, is_ready, is_connected, is_bot, is_spectator, joined_at)
		VALUES ($1, $2, $3, $4, $5, 1, 0, 0, 0, true, true, true, false, $6)
	`, botID, room.ID, botToken, botName, charID, now)
	if err != nil {
		return
	}

	h.broadcastRoomState(client.RoomCode)
	log.Info().Str("room", client.RoomCode).Str("bot", botName).Msg("Bot added")
}

func (h *RoomHandler) HandleChangeMap(client *websocket.Client, payload models.ChangeMapPayload) {
	if client.RoomCode == "" {
		return
	}

	room := h.getRoomState(client.RoomCode)
	if room == nil || room.Status != "LOBBY" || !isHost(client, room) {
		return
	}

	var mapExists bool
	err := database.Pool.QueryRow(context.Background(),
		"SELECT EXISTS(SELECT 1 FROM maps WHERE id = $1)", payload.MapID).Scan(&mapExists)
	if err != nil || !mapExists {
		return
	}

	_, err = database.Pool.Exec(context.Background(),
		"UPDATE rooms SET map_id = $1, updated_at = $2 WHERE code = $3",
		payload.MapID, time.Now(), client.RoomCode)
	if err != nil {
		return
	}

	h.broadcastRoomState(client.RoomCode)
}

func (h *RoomHandler) HandleLeaveRoom(client *websocket.Client, _ models.LeaveRoomPayload) {
	if client.RoomCode == "" || client.PlayerID == "" {
		return
	}

	roomCode := client.RoomCode
	room := h.getRoomState(roomCode)
	if room == nil {
		return
	}

	// Host adalah spectator, jangan pakai !IsSpectator untuk mendeteksinya.
	hostLeaving := isHost(client, room)

	// Delete player and remove from spectator_ids if applicable
	_, _ = database.Pool.Exec(context.Background(),
		"DELETE FROM players WHERE id = $1", client.PlayerID)
	_, _ = database.Pool.Exec(context.Background(),
		"UPDATE rooms SET spectator_ids = array_remove(spectator_ids, $1) WHERE code = $2",
		client.PlayerID, roomCode)

	// If host left, end room or transfer host
	if hostLeaving {
		// For simplicity, end the room
		_, _ = database.Pool.Exec(context.Background(),
			"UPDATE rooms SET status = 'GAME_OVER', updated_at = $1 WHERE code = $2",
			time.Now(), roomCode)
	}

	// Satu-satunya PLAYER_LEFT dikirim hub.leaveRoom (juga saat disconnect).
	h.hub.LeaveRoom(client)

	h.broadcastRoomState(roomCode)
	log.Info().Str("room", roomCode).Str("player", client.PlayerID).Msg("Player left room")
}

// Helper methods
func (h *RoomHandler) getRoomState(code string) *models.Room {
	var room models.Room
	var roomID uuid.UUID
	var categories []string
	var spectatorIDs []uuid.UUID
	var turnStateJSON []byte
	var questionSetID *uuid.UUID
	var currentPlayerID *uuid.UUID

	err := database.Pool.QueryRow(context.Background(), `
		SELECT id, code, name, host_token, map_id, status, max_players, question_mode, question_set_id, categories, turn_time_limit_sec, current_turn, current_player_id, turn_state, spectator_ids, created_at, updated_at
		FROM rooms WHERE code = $1
	`, code).Scan(
		&roomID, &room.Code, &room.Name, &room.HostToken, &room.MapID, &room.Status, &room.MaxPlayers, &room.QuestionMode,
		&questionSetID, &categories, &room.TurnTimeLimitSec, &room.CurrentTurn, &currentPlayerID, &turnStateJSON, &spectatorIDs, &room.CreatedAt, &room.UpdatedAt,
	)
	if err != nil {
		return nil
	}

	room.ID = roomID.String()
	if questionSetID != nil {
		s := questionSetID.String()
		room.QuestionSetID = &s
	}
	if currentPlayerID != nil {
		s := currentPlayerID.String()
		room.CurrentPlayerID = &s
	}
	room.Categories = categories
	room.SpectatorIDs = make([]string, 0, len(spectatorIDs))
	for _, id := range spectatorIDs {
		room.SpectatorIDs = append(room.SpectatorIDs, id.String())
	}
	if err := json.Unmarshal(turnStateJSON, &room.TurnState); err != nil {
		log.Warn().Err(err).Str("room", code).Msg("Failed to decode turn_state")
	}

	return &room
}

func (h *RoomHandler) getPlayersByRoomCode(code string) []*models.Player {
	rows, err := database.Pool.Query(context.Background(), `
		SELECT p.id, p.room_id, p.player_token, p.nickname, p.character_id, p.position, p.score, p.correct_answers, p.total_answer_time_ms, p.is_ready, p.is_connected, p.is_bot, p.is_spectator, p.joined_at
		FROM players p
		JOIN rooms r ON p.room_id = r.id
		WHERE r.code = $1 AND p.is_spectator = false
		ORDER BY p.joined_at ASC
	`, code)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var players []*models.Player
	for rows.Next() {
		var p models.Player
		err := rows.Scan(&p.ID, &p.RoomID, &p.PlayerToken, &p.Nickname, &p.CharacterID, &p.Position, &p.Score, &p.CorrectAnswers, &p.TotalAnswerTimeMs, &p.IsReady, &p.IsConnected, &p.IsBot, &p.IsSpectator, &p.JoinedAt)
		if err == nil {
			players = append(players, &p)
		}
	}
	return players
}

func (h *RoomHandler) getPlayers(roomID uuid.UUID) []*models.Player {
	rows, err := database.Pool.Query(context.Background(), `
		SELECT id, room_id, player_token, nickname, character_id, position, score, correct_answers, total_answer_time_ms, is_ready, is_connected, is_bot, is_spectator, joined_at
		FROM players WHERE room_id = $1 AND is_spectator = false ORDER BY joined_at ASC
	`, roomID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var players []*models.Player
	for rows.Next() {
		var p models.Player
		err := rows.Scan(&p.ID, &p.RoomID, &p.PlayerToken, &p.Nickname, &p.CharacterID, &p.Position, &p.Score, &p.CorrectAnswers, &p.TotalAnswerTimeMs, &p.IsReady, &p.IsConnected, &p.IsBot, &p.IsSpectator, &p.JoinedAt)
		if err == nil {
			players = append(players, &p)
		}
	}
	return players
}

func (h *RoomHandler) getSpectatorsByRoomCode(code string) []*models.Player {
	rows, err := database.Pool.Query(context.Background(), `
		SELECT p.id, p.room_id, p.player_token, p.nickname, p.character_id, p.position, p.score, p.correct_answers, p.total_answer_time_ms, p.is_ready, p.is_connected, p.is_bot, p.is_spectator, p.joined_at
		FROM players p
		JOIN rooms r ON p.room_id = r.id
		WHERE r.code = $1 AND p.is_spectator = true
		ORDER BY p.joined_at ASC
	`, code)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var spectators []*models.Player
	for rows.Next() {
		var p models.Player
		err := rows.Scan(&p.ID, &p.RoomID, &p.PlayerToken, &p.Nickname, &p.CharacterID, &p.Position, &p.Score, &p.CorrectAnswers, &p.TotalAnswerTimeMs, &p.IsReady, &p.IsConnected, &p.IsBot, &p.IsSpectator, &p.JoinedAt)
		if err == nil {
			spectators = append(spectators, &p)
		}
	}
	return spectators
}

func (h *RoomHandler) getSpectators(roomID uuid.UUID) []*models.Player {
	rows, err := database.Pool.Query(context.Background(), `
		SELECT id, room_id, player_token, nickname, character_id, position, score, correct_answers, total_answer_time_ms, is_ready, is_connected, is_bot, is_spectator, joined_at
		FROM players WHERE room_id = $1 AND is_spectator = true ORDER BY joined_at ASC
	`, roomID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var spectators []*models.Player
	for rows.Next() {
		var p models.Player
		err := rows.Scan(&p.ID, &p.RoomID, &p.PlayerToken, &p.Nickname, &p.CharacterID, &p.Position, &p.Score, &p.CorrectAnswers, &p.TotalAnswerTimeMs, &p.IsReady, &p.IsConnected, &p.IsBot, &p.IsSpectator, &p.JoinedAt)
		if err == nil {
			spectators = append(spectators, &p)
		}
	}
	return spectators
}

// startTurn membuka giliran pertama setelah status STARTING.
func (h *RoomHandler) startTurn(roomCode, playerID string) {
	room := h.getRoomState(roomCode)
	if room == nil || room.Status != "STARTING" {
		return
	}

	players := h.getPlayersByRoomCode(roomCode)
	current := h.findPlayer(players, playerID)
	if current == nil {
		return
	}

	now := time.Now()
	room.Status = "TURN_START"
	room.CurrentPlayerID = &playerID
	room.TurnState = models.TurnState{
		TurnNumber:       room.CurrentTurn,
		CurrentPlayerID:  playerID,
		UsedQuestionIDs:  room.TurnState.UsedQuestionIDs,
		TurnStartedAtMs:  now.UnixMilli(),
	}
	turnStateJSON, _ := json.Marshal(room.TurnState)

	_, err := database.Pool.Exec(context.Background(), `
		UPDATE rooms SET status = $1, current_player_id = $2, turn_state = $3, updated_at = $4 WHERE code = $5
	`, room.Status, playerID, turnStateJSON, now, roomCode)
	if err != nil {
		log.Error().Err(err).Str("room", roomCode).Msg("Failed to start first turn")
		return
	}

	h.hub.BroadcastToRoom(roomCode, models.NewMessage(models.MsgTurnStarted, models.TurnStartedPayload{
		RoomCode:              roomCode,
		TurnNumber:            room.CurrentTurn,
		CurrentPlayerID:       playerID,
		CurrentPlayerNickname: current.Nickname,
		Position:              current.Position,
		TurnStartedAt:         now.UnixMilli(),
	}))

	if h.onTurnStarted != nil {
		h.onTurnStarted(roomCode)
	}
	log.Info().Str("room", roomCode).Str("player", playerID).Msg("First turn started")
}

func (h *RoomHandler) findPlayer(players []*models.Player, id string) *models.Player {
	for _, p := range players {
		if p.ID == id {
			return p
		}
	}
	return nil
}

func (h *RoomHandler) broadcastRoomState(code string) {
	room := h.getRoomState(code)
	if room == nil {
		return
	}
	players := h.getPlayersByRoomCode(code)
	spectators := h.getSpectatorsByRoomCode(code)

	h.hub.BroadcastToRoom(code, models.NewMessage(models.MsgRoomState, models.RoomStatePayload{
		Room:       room,
		Players:    players,
		Spectators: spectators,
	}))
}

func (h *RoomHandler) sendError(client *websocket.Client, code, message string) {
	h.hub.SendToClient(client, models.NewMessage(models.MsgError, models.ErrorPayload{
		Code:    code,
		Message: message,
	}))
}