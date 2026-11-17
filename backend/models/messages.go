package models

import (
	"encoding/json"
	"time"
)

// ============================================
// WebSocket Message Types
// ============================================

// Client -> Server
const (
	MsgCreateRoom      = "CREATE_ROOM"
	MsgJoinRoom        = "JOIN_ROOM"
	MsgSpectateRoom    = "SPECTATE_ROOM"
	MsgSetReady        = "SET_READY"
	MsgStartGame       = "START_GAME"
	MsgRollDice        = "ROLL_DICE"
	MsgSubmitAnswer    = "SUBMIT_ANSWER"
	MsgLeaveRoom       = "LEAVE_ROOM"
	MsgAddBot          = "ADD_BOT"
	MsgChangeMap       = "CHANGE_MAP"
	MsgPing            = "PING"
)

// Server -> Client
const (
	MsgRoomState         = "ROOM_STATE"
	MsgPlayerJoined      = "PLAYER_JOINED"
	MsgPlayerLeft        = "PLAYER_LEFT"
	MsgPlayerReadyUpdate = "PLAYER_READY_UPDATE"
	MsgGameStarted       = "GAME_STARTED"
	MsgTurnStarted       = "TURN_STARTED"
	MsgDiceResult        = "DICE_RESULT"
	MsgQuestionStarted   = "QUESTION_STARTED"
	MsgAnswerResult      = "ANSWER_RESULT"
	MsgPlayerMoved       = "PLAYER_MOVED"
	MsgLadderTriggered   = "LADDER_TRIGGERED"
	MsgSnakeTriggered    = "SNAKE_TRIGGERED"
	MsgTurnChanged       = "TURN_CHANGED"
	MsgLeaderboardUpdate = "LEADERBOARD_UPDATE"
	MsgGameOver          = "GAME_OVER"
	MsgError             = "ERROR"
	MsgPong              = "PONG"
)

// ============================================
// Base Message Envelope
// ============================================

type WSMessage struct {
	Type      string          `json:"type"`
	Payload   json.RawMessage `json:"payload"`
	Timestamp int64           `json:"timestamp"`
}

func NewMessage(msgType string, payload interface{}) *WSMessage {
	data, _ := json.Marshal(payload)
	return &WSMessage{
		Type:      msgType,
		Payload:   data,
		Timestamp: time.Now().UnixMilli(),
	}
}

// ============================================
// Payload Types - Client -> Server
// ============================================

type CreateRoomPayload struct {
	RoomName          string   `json:"room_name"`
	HostNickname      string   `json:"host_nickname"`
	MapID             string   `json:"map_id"`
	MaxPlayers        int      `json:"max_players"`
	QuestionMode      string   `json:"question_mode"`
	QuestionSetID     string   `json:"question_set_id,omitempty"`
	Categories        []string `json:"categories"`
	TurnTimeLimitSec  int      `json:"turn_time_limit_sec"`
}

type JoinRoomPayload struct {
	RoomCode    string `json:"room_code"`
	Nickname    string `json:"nickname"`
	CharacterID string `json:"character_id"`
}

type SpectateRoomPayload struct {
	RoomCode  string `json:"room_code"`
	Nickname  string `json:"nickname,omitempty"`
	HostToken string `json:"host_token,omitempty"`
}

type SetReadyPayload struct {
	Ready bool `json:"ready"`
}

type StartGamePayload struct {
	HostToken string `json:"host_token"`
}

type RollDicePayload struct{}

type SubmitAnswerPayload struct {
	QuestionID string `json:"question_id"`
	OptionID   string `json:"option_id"`
}

type LeaveRoomPayload struct{}

type AddBotPayload struct{}

type ChangeMapPayload struct {
	MapID string `json:"map_id"`
}

type PingPayload struct{}

// ============================================
// Payload Types - Server -> Client
// ============================================

type RoomStatePayload struct {
	Room       *Room      `json:"room"`
	Players    []*Player  `json:"players"`
	Spectators []*Player  `json:"spectators"`
	You        *Player    `json:"you,omitempty"`
	// Token dikirim terpisah HANYA ke client yang bersangkutan, tidak ikut
	// di-broadcast bersama Room/Player.
	HostToken   string `json:"host_token,omitempty"`
	PlayerToken string `json:"player_token,omitempty"`
}

type PlayerJoinedPayload struct {
	RoomCode string  `json:"room_code"`
	Player   *Player `json:"player"`
}

type PlayerLeftPayload struct {
	RoomCode  string `json:"room_code"`
	PlayerID  string `json:"player_id"`
	Nickname  string `json:"nickname"`
}

type PlayerReadyUpdatePayload struct {
	RoomCode string `json:"room_code"`
	PlayerID string `json:"player_id"`
	Ready    bool   `json:"ready"`
}

type GameStartedPayload struct {
	RoomCode string `json:"room_code"`
}

type TurnStartedPayload struct {
	RoomCode             string `json:"room_code"`
	TurnNumber           int    `json:"turn_number"`
	CurrentPlayerID      string `json:"current_player_id"`
	CurrentPlayerNickname string `json:"current_player_nickname"`
	Position             int    `json:"position"`
	TurnStartedAt        int64  `json:"turn_started_at"`
}

type DiceResultPayload struct {
	RoomCode        string `json:"room_code"`
	PlayerID        string `json:"player_id"`
	DiceValue       int    `json:"dice_value"`
	Difficulty      int    `json:"difficulty"`
	CurrentPosition int    `json:"current_position"`
	TargetPosition  int    `json:"target_position"`
	QuestionID      string `json:"question_id"`
	AnimationSeed   int    `json:"animation_seed"`
}

type QuestionStartedPayload struct {
	RoomCode    string       `json:"room_code"`
	PlayerID    string       `json:"player_id"`
	Question    QuestionPublic `json:"question"`
	DeadlineMs  int64        `json:"deadline_ms"`
}

type QuestionPublic struct {
	QuestionID   string         `json:"question_id"`
	QuestionText string         `json:"question_text"`
	Category     string         `json:"category"`
	Difficulty   int            `json:"difficulty"`
	TimeLimitSec int            `json:"time_limit_sec"`
	StartedAtMs  int64          `json:"started_at_ms"`
	DeadlineMs   int64          `json:"deadline_ms"`
	Options      []OptionPublic `json:"options"`
}

type OptionPublic struct {
	ID   string `json:"id"`
	Text string `json:"text"`
}

type AnswerResultPayload struct {
	RoomCode   string        `json:"room_code"`
	Result     AnswerResult  `json:"result"`
}

type AnswerResult struct {
	PlayerID           string `json:"player_id"`
	QuestionID         string `json:"question_id"`
	SelectedOptionID   string `json:"selected_option_id"`
	IsCorrect          bool   `json:"is_correct"`
	IsTimeout          bool   `json:"is_timeout"`
	CorrectOptionID    string `json:"correct_option_id"`
	Explanation        string `json:"explanation"`
	PointsEarned       int64  `json:"points_earned"`
	TotalScore         int64  `json:"total_score"`
	AnswerTimeMs       int64  `json:"answer_time_ms"`
	MovementAllowed    bool   `json:"movement_allowed"`
	Overshoot100       bool   `json:"overshoot_100"`
}

type PlayerMovedPayload struct {
	RoomCode      string `json:"room_code"`
	PlayerID      string `json:"player_id"`
	FromPosition  int    `json:"from_position"`
	ToPosition    int    `json:"to_position"`
	Steps         int    `json:"steps"`
	MovementType  string `json:"movement_type"`
	EdgeID        string `json:"edge_id,omitempty"`
	IsFinished    bool   `json:"is_finished"`
}

type LadderTriggeredPayload struct {
	RoomCode     string `json:"room_code"`
	PlayerID     string `json:"player_id"`
	LadderID     string `json:"ladder_id"`
	Label        string `json:"label"`
	FromPosition int    `json:"from_position"`
	ToPosition   int    `json:"to_position"`
}

type SnakeTriggeredPayload struct {
	RoomCode     string `json:"room_code"`
	PlayerID     string `json:"player_id"`
	SnakeID      string `json:"snake_id"`
	Label        string `json:"label"`
	FromPosition int    `json:"from_position"`
	ToPosition   int    `json:"to_position"`
}

type TurnChangedPayload struct {
	RoomCode            string `json:"room_code"`
	TurnNumber          int    `json:"turn_number"`
	PreviousPlayerID    string `json:"previous_player_id,omitempty"`
	CurrentPlayerID     string `json:"current_player_id"`
	CurrentPlayerNickname string `json:"current_player_nickname"`
}

type LeaderboardUpdatePayload struct {
	RoomCode    string           `json:"room_code"`
	Leaderboard []LeaderboardEntry `json:"leaderboard"`
}

type LeaderboardEntry struct {
	Rank                 int    `json:"rank"`
	PlayerID             string `json:"player_id"`
	Nickname             string `json:"nickname"`
	CharacterID          string `json:"character_id"`
	Position             int    `json:"position"`
	Score                int64  `json:"score"`
	CorrectAnswers       int    `json:"correct_answers"`
	TotalAnswerTimeMs    int64  `json:"total_answer_time_ms"`
	IsBot                bool   `json:"is_bot"`
}

type GameOverPayload struct {
	RoomCode  string          `json:"room_code"`
	Result    GameResult      `json:"result"`
}

type GameResult struct {
	RoomCode    string             `json:"room_code"`
	RoomName    string             `json:"room_name"`
	MapID       string             `json:"map_id"`
	Winner      *LeaderboardEntry  `json:"winner"`
	Leaderboard []LeaderboardEntry `json:"leaderboard"`
	TotalTurns  int                `json:"total_turns"`
	EndedAt     string             `json:"ended_at"`
}

type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type PongPayload struct {
	Timestamp int64 `json:"timestamp"`
}

// ============================================
// Domain Models
// ============================================

type Room struct {
	ID                 string    `json:"id"`
	Code               string    `json:"code"`
	Name               string    `json:"name"`
	HostToken          string    `json:"-"`
	MapID              string    `json:"map_id"`
	Status             string    `json:"status"`
	MaxPlayers         int       `json:"max_players"`
	QuestionMode       string    `json:"question_mode"`
	QuestionSetID      *string   `json:"question_set_id,omitempty"`
	Categories         []string  `json:"categories"`
	TurnTimeLimitSec   int       `json:"turn_time_limit_sec"`
	CurrentTurn        int       `json:"current_turn"`
	CurrentPlayerID    *string   `json:"current_player_id,omitempty"`
	TurnState          TurnState `json:"turn_state"`
	SpectatorIDs       []string  `json:"spectator_ids"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type Player struct {
	ID                  string    `json:"id"`
	RoomID              string    `json:"room_id"`
	PlayerToken         string    `json:"-"`
	Nickname            string    `json:"nickname"`
	CharacterID         string    `json:"character_id"`
	Position            int       `json:"position"`
	Score               int64     `json:"score"`
	CorrectAnswers      int       `json:"correct_answers"`
	TotalAnswerTimeMs   int64     `json:"total_answer_time_ms"`
	IsReady             bool      `json:"is_ready"`
	IsConnected         bool      `json:"is_connected"`
	IsBot               bool      `json:"is_bot"`
	IsSpectator         bool      `json:"is_spectator"`
	JoinedAt            time.Time `json:"joined_at"`
}

type TurnState struct {
	TurnNumber        int            `json:"turn_number"`
	CurrentPlayerID   string         `json:"current_player_id"`
	DiceValue         *int           `json:"dice_value,omitempty"`
	AnimationSeed     *int           `json:"animation_seed,omitempty"`
	ActiveQuestion    *QuestionPublic `json:"active_question,omitempty"`
	AnsweredOptionID  *string        `json:"answered_option_id,omitempty"`
	LastAnswerResult  *AnswerResult  `json:"last_answer_result,omitempty"`
	LastMovement      *Movement      `json:"last_movement,omitempty"`
	UsedQuestionIDs   []string       `json:"used_question_ids"`
	TurnStartedAtMs   int64          `json:"turn_started_at_ms"`
}

type Movement struct {
	PlayerID       string `json:"player_id"`
	FromPosition   int    `json:"from_position"`
	ToPosition     int    `json:"to_position"`
	Steps          int    `json:"steps"`
	MovementType   string `json:"movement_type"`
	EdgeID         string `json:"edge_id,omitempty"`
	IsFinished     bool   `json:"is_finished"`
}

type Question struct {
	ID               string     `json:"id"`
	QuestionText     string     `json:"question_text"`
	Category         string     `json:"category"`
	Difficulty       int        `json:"difficulty"`
	TimeLimitSec     int        `json:"time_limit_sec"`
	Options          []Option   `json:"options"`
	CorrectOptionID  string     `json:"correct_option_id"`
	Explanation      string     `json:"explanation"`
	IsActive         bool       `json:"is_active"`
	CreatedAt        time.Time  `json:"created_at"`
}

type Option struct {
	ID       string `json:"id"`
	Text     string `json:"text"`
	IsCorrect bool   `json:"is_correct,omitempty"`
}

type QuestionSet struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	QuestionIDs []string `json:"question_ids"`
	CreatedAt   time.Time `json:"created_at"`
}

type MapTheme struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	TitleID     string   `json:"title_id"`
	Subtitle    string   `json:"subtitle"`
	Description string   `json:"description"`
	ImageURL    string   `json:"image_url"`
	AccentColor string   `json:"accent_color"`
	BadgeBG     string   `json:"badge_bg"`
	Features    []string `json:"features"`
	Snakes      []Snake  `json:"snakes"`
	Ladders     []Ladder `json:"ladders"`
	IsActive    bool     `json:"is_active"`
}

type Snake struct {
	ID    string `json:"id"`
	From  int    `json:"from"`
	To    int    `json:"to"`
	Label string `json:"label,omitempty"`
}

type Ladder struct {
	ID    string `json:"id"`
	From  int    `json:"from"`
	To    int    `json:"to"`
	Label string `json:"label,omitempty"`
}