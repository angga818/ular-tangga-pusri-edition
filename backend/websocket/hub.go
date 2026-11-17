package websocket

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
	"ular-tangga-pusri-backend/models"
)

// Hub maintains the set of active clients and broadcasts messages to rooms
type Hub struct {
	rooms       map[string]*Room
	clients     map[*Client]bool
	broadcast   chan []byte
	Register    chan *Client
	Unregister  chan *Client
	mu          sync.RWMutex
	HandleMessage func(client *Client, message []byte)
}

type Room struct {
	Code     string
	Clients  map[*Client]bool
	Spectators map[*Client]bool
	mu       sync.RWMutex
}

type Client struct {
	Hub      *Hub
	Conn     *websocket.Conn
	Send     chan []byte
	RoomCode string
	PlayerID string
	IsSpectator bool
	mu       sync.Mutex
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[string]*Room),
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
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
				close(client.Send)
			}
			h.mu.Unlock()

			if client.RoomCode != "" {
				h.leaveRoom(client)
			}

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) joinRoom(client *Client) {
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
	h.mu.Unlock()

	room.mu.Lock()
	if client.IsSpectator {
		room.Spectators[client] = true
	} else {
		room.Clients[client] = true
	}
	room.mu.Unlock()

	log.Info().
		Str("room", client.RoomCode).
		Str("player", client.PlayerID).
		Bool("spectator", client.IsSpectator).
		Msg("Client joined room")
}

func (h *Hub) leaveRoom(client *Client) {
	h.mu.RLock()
	room, exists := h.rooms[client.RoomCode]
	h.mu.RUnlock()

	if !exists {
		return
	}

	room.mu.Lock()
	delete(room.Clients, client)
	delete(room.Spectators, client)
	room.mu.Unlock()

	// Notify others in room
	msg := models.NewMessage(models.MsgPlayerLeft, models.PlayerLeftPayload{
		RoomCode: client.RoomCode,
		PlayerID: client.PlayerID,
	})
	data, _ := json.Marshal(msg)
	h.broadcastToRoom(client.RoomCode, data, client)

	// Clean up empty rooms
	room.mu.RLock()
	empty := len(room.Clients) == 0 && len(room.Spectators) == 0
	room.mu.RUnlock()

	if empty {
		h.mu.Lock()
		delete(h.rooms, client.RoomCode)
		h.mu.Unlock()
	}
}

func (h *Hub) broadcastToRoom(roomCode string, message []byte, exclude *Client) {
	h.mu.RLock()
	room, exists := h.rooms[roomCode]
	h.mu.RUnlock()

	if !exists {
		return
	}

	room.mu.RLock()
	defer room.mu.RUnlock()

	for client := range room.Clients {
		if client != exclude {
			select {
			case client.Send <- message:
			default:
				close(client.Send)
				delete(room.Clients, client)
			}
		}
	for client := range room.Spectators {
		if client != exclude {
			select {
			case client.Send <- message:
			default:
				close(client.Send)
				delete(room.Spectators, client)
			}
		}
	}
}

func (h *Hub) BroadcastToRoom(roomCode string, message *models.WSMessage) {
	data, _ := json.Marshal(message)
	h.broadcastToRoom(roomCode, data, nil)
}

func (h *Hub) SendToClient(client *Client, message *models.WSMessage) {
	data, _ := json.Marshal(message)
	client.mu.Lock()
	defer client.mu.Unlock()
	select {
	case client.Send <- data:
	default:
		close(client.Send)
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