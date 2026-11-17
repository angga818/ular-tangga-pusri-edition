# Ular Tangga PUSRI Edition - Backend

Go + WebSocket + PostgreSQL backend for real-time multiplayer Snakes & Ladders educational game.

## Arsitektur

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   React     │ ◄────────────────► │   Go        │
│  (Client)   │   (Real-time)      │  (Server)   │
└─────────────┘                    └──────┬──────┘
                                          │
                                    ┌─────▼─────┐
                                    │PostgreSQL │
                                    │ (Persist) │
                                    └───────────┘
```

## Fitur

- **Real-time Multiplayer**: WebSocket untuk sinkronisasi state game antar perangkat
- **Authoritative Server**: Semua logika game (dadu, pertanyaan, gerakan, ular/tangga) di server
- **Room Management**: Buat room, join room, spectate, bot players
- **Game Logic**: Dadu, pertanyaan tingkat 1-6, skor PRD 3.5, ular/tangga, leaderboard
- **Bot AI**: Bot dengan tingkat kesulitan yang disesuaikan
- **PostgreSQL**: Persistensi room, player, questions, game results

## Prasyarat

- Go 1.23+
- PostgreSQL 16+
- Docker & Docker Compose (opsional)

## Quick Start

### Dengan Docker Compose (Direkomendasikan)

```bash
cd backend
cp .env.example .env
docker-compose up -d
```

Backend akan berjalan di `http://localhost:8080`, WebSocket di `ws://localhost:8080/ws`.

### Manual

1. **Setup PostgreSQL:**
```sql
CREATE DATABASE ular_tangga;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE ular_tangga TO postgres;
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env jika perlu
```

3. **Run:**
```bash
go mod tidy
go run main.go
```

## WebSocket Protocol

### Client → Server

| Type | Payload | Deskripsi |
|------|---------|-----------|
| `CREATE_ROOM` | `CreateRoomPayload` | Buat room baru |
| `JOIN_ROOM` | `JoinRoomPayload` | Gabung sebagai player |
| `SPECTATE_ROOM` | `SpectateRoomPayload` | Gabung sebagai pengamat |
| `SET_READY` | `SetReadyPayload` | Toggle status siap |
| `START_GAME` | `StartGamePayload` | Host memulai game |
| `ROLL_DICE` | `{}` | Lempar dadu |
| `SUBMIT_ANSWER` | `SubmitAnswerPayload` | Kirim jawaban |
| `LEAVE_ROOM` | `{}` | Keluar dari room |
| `ADD_BOT` | `{}` | Tambah bot (host only) |
| `CHANGE_MAP` | `ChangeMapPayload` | Ganti tema peta (host only) |
| `PING` | `{}` | Heartbeat |

### Server → Client

| Type | Payload | Deskripsi |
|------|---------|-----------|
| `ROOM_STATE` | `RoomStatePayload` | State lengkap room |
| `PLAYER_JOINED` | `PlayerJoinedPayload` | Player baru gabung |
| `PLAYER_LEFT` | `PlayerLeftPayload` | Player keluar |
| `PLAYER_READY_UPDATE` | `PlayerReadyUpdatePayload` | Status siap berubah |
| `GAME_STARTED` | `GameStartedPayload` | Game dimulai |
| `TURN_STARTED` | `TurnStartedPayload` | Giliran baru dimulai |
| `DICE_RESULT` | `DiceResultPayload` | Hasil dadu + pertanyaan |
| `QUESTION_STARTED` | `QuestionStartedPayload` | Pertanyaan muncul |
| `ANSWER_RESULT` | `AnswerResultPayload` | Hasil jawaban |
| `PLAYER_MOVED` | `PlayerMovedPayload` | Karakter bergerak |
| `LADDER_TRIGGERED` | `LadderTriggeredPayload` | Naik tangga |
| `SNAKE_TRIGGERED` | `SnakeTriggeredPayload` | Terkena ular |
| `TURN_CHANGED` | `TurnChangedPayload` | Giliran berganti |
| `LEADERBOARD_UPDATE` | `LeaderboardUpdatePayload` | Update papan skor |
| `GAME_OVER` | `GameOverPayload` | Game selesai |
| `ERROR` | `ErrorPayload` | Error message |
| `PONG` | `PongPayload` | Heartbeat response |

## Database Schema

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
    spectator_ids UUID[] DEFAULT '{}',
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

-- questions, question_sets, game_results, maps, characters...
```

## Scoring Formula (PRD 3.5)

```
points = round(1000 × time_factor × difficulty_multiplier)

time_factor = max(0, min(1, 1 - answer_time_ms / time_limit_ms))
difficulty_multiplier = 1 + (difficulty - 1) × 0.2
```

- Jawaban benar dalam waktu cepat = skor tinggi
- Tingkat kesulitan dadu (1-6) mempengaruhi multiplier
- Jawaban salah/timeout = 0 poin

## Deployment

### Production (Railway/Render/Fly.io)

1. Push ke Git repository
2. Connect ke platform deployment
3. Set environment variables
4. Deploy PostgreSQL (managed service)
5. Deploy Go service

### Environment Variables Production

```env
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
DB_HOST=your-postgres-host
DB_PORT=5432
DB_USER=your-user
DB_PASSWORD=your-secure-password
DB_NAME=ular_tangga
DB_SSL_MODE=require
```

## Frontend Integration

Update frontend untuk menggunakan WebSocket backend:

```typescript
// Vite env
VITE_WS_URL=ws://your-backend-domain/ws
VITE_USE_WEBSOCKET=true
```

Frontend akan otomatis:
- Connect ke WebSocket server
- Handle reconnection
- Fallback ke localStorage mode jika WS gagal

## Testing

```bash
# Unit tests
go test ./...

# Manual WebSocket test
wscat -c ws://localhost:8080/ws
# Send: {"type":"CREATE_ROOM","payload":{"room_name":"Test","host_nickname":"Host","map_id":"industrial_world","max_players":4,"question_mode":"RANDOM","categories":["PUSRI"],"turn_time_limit_sec":20}}
```

## License

MIT License - Ular Tangga PUSRI Edition