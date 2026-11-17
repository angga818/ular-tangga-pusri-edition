package websocket

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
	"ular-tangga-pusri-backend/models"
)

// Hub maintains the set of active clients and broadcasts messages to rooms
type Hub struct {
	rooms         map[string]*Room
	clients       map[*Client]bool
	broadcast     chan []byte
	Register      chan *Client
	Unregister    chan *Client
	mu            sync.RWMutex
	HandleMessage func(client *Client, message []byte)
}

type Room struct {
	Code       string
	Clients    map[*Client]bool
	Spectators map[*Client]bool
	mu         sync.RWMutex
}

type Client struct {
	Hub         *Hub
	Conn        *websocket.Conn
	Send        chan []byte
	RoomCode    string
	PlayerID    string
	HostToken   string
	Nickname    string
	IsSpectator bool

	mu        sync.Mutex
	sendClosed bool
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]*Room),
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		Register:   make(chan *Client, 256),
		Unregister: make(chan *Client, 256),
	}
}

// closeSend menutup channel kirim tepat satu kali (menghindari panic
// "close of closed channel" jika client sudah dihapus saat broadcast).
func (c *Client) closeSend() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.sendClosed {
		return
	}
	c.sendClosed = true
	close(c.Send)
}

func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return

		case client := <-h.Register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

			if client.RoomCode != "" {
				h.joinRoom(client)
			}

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
			}
			h.mu.Unlock()
			client.closeSend()

			if client.RoomCode != "" {
				h.leaveRoom(client)
			}

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					// Salah kirim: tandai agar dihapus setelah loop selesai.
					// (Menutup channel di sini bisa menimpa WritePump.)
					go func(c *Client) { h.Unregister <- c }(client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// JoinRoom / LeaveRoom dipanggil handler setelah RoomCode dan IsSpectator
// diketahui. Register dari main.go masih terjadi dengan RoomCode kosong,
// jadi tanpa wrapper ini room tidak pernah terdaftar di h.rooms.
func (h *Hub) JoinRoom(client *Client) {
	if client == nil || client.RoomCode == "" {
		return
	}
	h.joinRoom(client)
}

func (h *Hub) LeaveRoom(client *Client) {
	if client == nil || client.RoomCode == "" {
		return
	}
	h.leaveRoom(client)
	// Mencegah leaveRoom dipanggil dua kali oleh Unregister saat disconnect.
	client.RoomCode = ""
}

func (h *Hub) joinRoom(client *Client) {
	// Selalu kunci h.mu lebih dulu, lalu room.mu (urutan konsisten dengan
	// leaveRoom) supaya room tidak bisa dihapus saat client bergabung.
	h.mu.Lock()
	room, exists := h.rooms[client.RoomCode]
	if !exists {
		room = &Room{
			Code:       client.RoomCode,
			Clients:    make(map[*Client]bool),
			Spectators: make(map[*Client]bool),
		}
		h.rooms[client.RoomCode] = room
	}

	room.mu.Lock()
	if client.IsSpectator {
		room.Spectators[client] = true
	} else {
		room.Clients[client] = true
	}
	room.mu.Unlock()
	h.mu.Unlock()

	log.Info().
		Str("room", client.RoomCode).
		Str("player", client.PlayerID).
		Bool("spectator", client.IsSpectator).
		Msg("Client joined room")
}

func (h *Hub) leaveRoom(client *Client) {
	h.mu.Lock()
	room, exists := h.rooms[client.RoomCode]
	if !exists {
		h.mu.Unlock()
		return
	}

	room.mu.Lock()
	delete(room.Clients, client)
	delete(room.Spectators, client)
	empty := len(room.Clients) == 0 && len(room.Spectators) == 0
	room.mu.Unlock()

	if empty {
		delete(h.rooms, client.RoomCode)
	}
	h.mu.Unlock()

	if empty {
		return
	}

	// Satu-satunya sumber PLAYER_LEFT: jangan dikirim ulang dari handler.
	msg := models.NewMessage(models.MsgPlayerLeft, models.PlayerLeftPayload{
		RoomCode: client.RoomCode,
		PlayerID: client.PlayerID,
		Nickname: client.Nickname,
	})
	data, _ := json.Marshal(msg)
	h.broadcastToRoom(client.RoomCode, data, client)
}

// broadcastToRoom mengirim pesan ke pemain DAN pengamat dalam satu room.
func (h *Hub) broadcastToRoom(roomCode string, message []byte, exclude *Client) {
	h.mu.RLock()
	room, exists := h.rooms[roomCode]
	if !exists {
		h.mu.RUnlock()
		return
	}

	room.mu.RLock()
	targets := make([]*Client, 0, len(room.Clients)+len(room.Spectators))
	for client := range room.Clients {
		if client != exclude {
			targets = append(targets, client)
		}
	}
	for client := range room.Spectators {
		if client != exclude {
			targets = append(targets, client)
		}
	}
	room.mu.RUnlock()
	h.mu.RUnlock()

	for _, client := range targets {
		client.mu.Lock()
		closed := client.sendClosed
		if !closed {
			select {
			case client.Send <- message:
			default:
				// Antrean penuh: lewati pesan ini, jangan tutup channel di sini
				// karena WritePump yang berwenang menutup koneksi.
			}
		}
		client.mu.Unlock()
	}
}

func (h *Hub) BroadcastToRoom(roomCode string, message *models.WSMessage) {
	data, _ := json.Marshal(message)
	h.broadcastToRoom(roomCode, data, nil)
}

func (h *Hub) SendToClient(client *Client, message *models.WSMessage) {
	if client == nil {
		return
	}
	data, _ := json.Marshal(message)
	client.mu.Lock()
	defer client.mu.Unlock()
	if client.sendClosed {
		return
	}
	select {
	case client.Send <- data:
	default:
		// Antrean penuh; jangan tutup channel agar WritePump tetap bisa kirim.
	}
}

// Client methods
func (c *Client) ReadPump(hub *Hub) {
	defer func() {
		hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(512 * 1024)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Error().Err(err).Msg("WebSocket read error")
			}
			break
		}

		if hub.HandleMessage != nil {
			hub.HandleMessage(c, message)
		}
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
