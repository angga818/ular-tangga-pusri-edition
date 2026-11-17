# Rencana Implementasi: Host Spectator + Animations + Real Multiplayer Backend

## 1. Host sebagai Spectator Saja (Bukan Pemain)

### Perubahan Backend (gameServer.ts)
- [ ] Modifikasi `createRoom`: Host **tidak** otomatis ditambahkan sebagai player
- [ ] Tambah field `host_player_id` atau `spectator_ids` di Room
- [ ] Host join sebagai "spectator" dengan role khusus
- [ ] Lobby: Host tidak perlu "Siap", hanya kontrol start game
- [ ] GameScreen: Host hanya observe, tidak mendapat giliran
- [ ] Leaderboard: Host tidak muncul

### Perubahan Frontend
- [ ] CreateRoom: Setelah create, host masuk lobby sebagai spectator
- [ ] Lobby: Tampilan beda untuk host (tidak ada tombol Siap, hanya "Mulai Permainan")
- [ ] GameScreen: Deteksi role spectator → hide dice/button jawab, show "Mode Pengamat"
- [ ] JoinRoom: Tetap sama (player biasa)

---

## 2. Animasi Framer Motion di Semua Aset/UI

### Komponen yang perlu animasi:
- [ ] **Tombol semua** - `whileHover`, `whileTap`, `initial`, `animate`, `exit`
- [ ] **Input fields** - focus animation, error shake
- [ ] **Cards/Sections** - stagger entrance, hover lift
- [ ] **Modal/Overlay** - scale + fade entrance/exit
- [ ] **List items** - stagger, layout animations
- [ ] **Dice3D** - enhance rolling animation
- [ ] **CharacterFigure** - idle bob, entrance pop
- [ ] **PhaserBoard** - sync dengan Framer untuk tile hover
- [ ] **Leaderboard** - `layout` untuk smooth reorder
- [ ] **Toast** - sudah ada, enhance
- [ ] **Screen transitions** - AnimatePresence di App.tsx
- [ ] **PIN display** - number counter animation
- [ ] **Progress bars** - animated width
- [ ] **ConnectionDot** - pulse animation

---

## 3. Real Multiplayer Backend: Go + WebSocket + PostgreSQL

### Arsitektur
```
┌─────────────┐     WebSocket      ┌─────────────┐
│   React     │ ◄────────────────► │   Go Server │
│  (Client)   │   (Real-time)      │  (Backend)  │
└─────────────┘                    └──────┬──────┘
                                          │
                                    ┌─────▼─────┐
                                    │PostgreSQL │
                                    │ (Persist) │
                                    └───────────┘
```

### Backend (Go) - Structure
```
backend/
├── main.go                 # Entry point
├── go.mod / go.sum
├── config/
│   └── config.go          # Env config (DB, WS, CORS)
├── database/
│   ├── database.go        # PG connection + migrations
│   └── migrations/        # SQL migration files
├── models/
│   ├── room.go
│   ├── player.go
│   ├── question.go
│   └── game.go
├── websocket/
│   ├── hub.go             # Connection hub (rooms)
│   ├── client.go          # WS client wrapper
│   └── messages.go        # Message types (JSON)
├── handlers/
│   ├── room.go            # Room CRUD
│   ├── game.go            # Game logic (authoritative)
│   └── websocket.go       # WS upgrade handler
├── services/
│   ├── question_service.go
│   └── leaderboard_service.go
└── utils/
    └── jwt.go             # Token auth (optional)
```

### Database Schema (PostgreSQL)
```sql
-- rooms
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(6) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    host_token VARCHAR(64) NOT NULL,
    map_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'LOBBY',
    max_players INT NOT NULL DEFAULT 4,
    question_mode VARCHAR(10) NOT NULL DEFAULT 'RANDOM',
    question_set_id UUID,
    categories TEXT[] DEFAULT '{}',
    turn_time_limit_sec INT NOT NULL DEFAULT 20,
    current_turn INT NOT NULL DEFAULT 0,
    current_player_id UUID,
    turn_state JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- players
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    player_token VARCHAR(64) NOT NULL,
    nickname VARCHAR(20) NOT NULL,
    character_id VARCHAR(50) NOT NULL,
    position INT NOT NULL DEFAULT 1,
    score BIGINT NOT NULL DEFAULT 0,
    correct_answers INT NOT NULL DEFAULT 0,
    total_answer_time_ms BIGINT NOT NULL DEFAULT 0,
    is_ready BOOLEAN NOT NULL DEFAULT FALSE,
    is_connected BOOLEAN NOT NULL DEFAULT TRUE,
    is_bot BOOLEAN NOT NULL DEFAULT FALSE,
    is_spectator BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- questions
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    category VARCHAR(30) NOT NULL,
    difficulty INT NOT NULL CHECK (difficulty BETWEEN 1 AND 6),
    time_limit_sec INT NOT NULL DEFAULT 20,
    options JSONB NOT NULL,
    correct_option_id VARCHAR(64) NOT NULL,
    explanation TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- question_sets
CREATE TABLE question_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    question_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- game_results
CREATE TABLE game_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    room_name VARCHAR(100) NOT NULL,
    map_id VARCHAR(50) NOT NULL,
    winner_id UUID,
    leaderboard JSONB NOT NULL,
    total_turns INT NOT NULL DEFAULT 0,
    ended_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- indexes
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_players_room ON players(room_id);
CREATE INDEX idx_questions_active ON questions(is_active, category, difficulty);
```

### WebSocket Protocol (JSON)
```typescript
// Client → Server
{ "type": "CREATE_ROOM", "payload": { ... } }
{ "type": "JOIN_ROOM", "payload": { room_code, nickname, character_id } }
{ "type": "SPECTATE_ROOM", "payload": { room_code } }
{ "type": "SET_READY", "payload": { ready: boolean } }
{ "type": "START_GAME", "payload": { host_token } }
{ "type": "ROLL_DICE", "payload": {} }
{ "type": "SUBMIT_ANSWER", "payload": { question_id, option_id } }
{ "type": "LEAVE_ROOM", "payload": {} }
{ "type": "PING", "payload": {} }

// Server → Client
{ "type": "ROOM_STATE", "payload": { room, players, you } }
{ "type": "PLAYER_JOINED", "payload": { player } }
{ "type": "PLAYER_LEFT", "payload": { player_id } }
{ "type": "PLAYER_READY_UPDATE", "payload": { player_id, ready } }
{ "type": "GAME_STARTED", "payload": { } }
{ "type": "TURN_STARTED", "payload": { turn_number, current_player_id, ... } }
{ "type": "DICE_RESULT", "payload": { dice_value, question, ... } }
{ "type": "QUESTION_STARTED", "payload": { question, deadline_ms } }
{ "type": "ANSWER_RESULT", "payload": { result } }
{ "type": "PLAYER_MOVED", "payload": { movement } }
{ "type": "LADDER_TRIGGERED", "payload": { ... } }
{ "type": "SNAKE_TRIGGERED", "payload": { ... } }
{ "type": "TURN_CHANGED", "payload": { ... } }
{ "type": "LEADERBOARD_UPDATE", "payload": { leaderboard } }
{ "type": "GAME_OVER", "payload": { result } }
{ "type": "ERROR", "payload": { code, message } }
{ "type": "PONG", "payload": {} }
```

### Frontend Integration
- [ ] Replace `gameServer` (BroadcastChannel) dengan WebSocket client
- [ ] Connection management: reconnect, heartbeat, queue messages saat offline
- [ ] Auth flow: token-based (room_code + player_token)
- [ ] Spectator connection: room_code only (no player_token)
- [ ] Migration: localStorage SQL → PostgreSQL (backend handles)

---

## Urutan Implementasi

### Phase 1: Host Spectator (Frontend only) - ~2 jam
1. Update types/game.ts - add `is_spectator` to Player, `spectator_ids` to Room
2. Update gameServer.ts - createRoom tanpa add host as player
3. Update CreateRoom.tsx - host auth role = 'spectator'
4. Update Lobby.tsx - host UI beda (no ready button)
4. Update GameScreen.tsx - spectator mode (observe only)

### Phase 2: Framer Motion Animations - ~3 jam
1. Create animation utilities (variants, transitions)
2. Update all buttons, inputs, cards, modals
4. Enhance Dice3D, CharacterFigure
5. Screen transitions in App.tsx
6. Stagger animations for lists

### Phase 3: Go Backend + WebSocket - ~6-8 jam
1. Setup Go project structure
2. Database migrations & models
3. WebSocket hub & client
4. Room & Game handlers (authoritative logic ported from TS)
5. Question service
6. CORS, health check, graceful shutdown
7. Docker Compose untuk PostgreSQL + Go

### Phase 4: Frontend WebSocket Integration - ~3 jam
1. New `websocketClient.ts` replacing gameServer subscription
2. Message handlers mapping WS events → store updates
3. Connection lifecycle (connect, reconnect, heartbeat)
4. Update App.tsx init
5. Test multi-device

---

## Catatan Penting

- **Backward compatibility**: LocalStorage mode tetap jalan untuk offline/dev
- **Feature flag**: `VITE_USE_WEBSOCKET=true` untuk enable backend
- **Bot support**: Backend juga handle bot logic
- **Question bank**: Seed questions via migration SQL
- **Deploy**: Railway/Render untuk Go + PostgreSQL, Vercel untuk frontend