package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"ular-tangga-pusri-backend/database"
	"ular-tangga-pusri-backend/models"
	"ular-tangga-pusri-backend/websocket"
)

type GameHandler struct {
	hub *websocket.Hub
}

func NewGameHandler(hub *websocket.Hub) *GameHandler {
	return &GameHandler{hub: hub}
}

// currentPlayerID mengambil ID pemain yang sedang bergiliran secara aman
// (kolom di DB nullable sehingga model memakai *string).
func currentPlayerID(room *models.Room) string {
	if room == nil || room.CurrentPlayerID == nil {
		return ""
	}
	return *room.CurrentPlayerID
}

// botClient membuat client internal untuk aksi bot. Perlu Hub dan channel Send
// agar helper sendError tidak panic saat ada error validasi.
func (h *GameHandler) botClient(roomCode, playerID string) *websocket.Client {
	return &websocket.Client{
		Hub:      h.hub,
		RoomCode: roomCode,
		PlayerID: playerID,
		Send:     make(chan []byte, 8),
	}
}

// Map configurations (same as frontend)
var mapConfigs = map[string]struct {
	Snakes  []models.Snake
	Ladders []models.Ladder
}{
	"industrial_world": {
		Snakes: []models.Snake{
			{ID: "snake_1", From: 98, To: 78, Label: "Pipa Bocor"},
			{ID: "snake_2", From: 95, To: 75, Label: "Kebocoran Gas"},
			{ID: "snake_3", From: 92, To: 52, Label: "Overheat"},
			{ID: "snake_4", From: 83, To: 43, Label: "Kerusakan Mesin"},
			{ID: "snake_5", From: 73, To: 33, Label: "Pipa Retak"},
			{ID: "snake_6", From: 64, To: 24, Label: "Kebocoran Kimia"},
			{ID: "snake_7", From: 54, To: 14, Label: "Kebakaran Kecil"},
			{ID: "snake_8", From: 43, To: 3, Label: "Eksplosif"},
		},
		Ladders: []models.Ladder{
			{ID: "ladder_1", From: 4, To: 14, Label: "Promosi Cepat"},
			{ID: "ladder_2", From: 9, To: 31, Label: "Proyek Baru"},
			{ID: "ladder_3", From: 20, To: 38, Label: "Bonus Produksi"},
			{ID: "ladder_4", From: 28, To: 84, Label: "Efisiensi Tinggi"},
			{ID: "ladder_5", From: 40, To: 59, Label: "Target Tercapai"},
			{ID: "ladder_6", From: 51, To: 67, Label: "Inovasi Proses"},
			{ID: "ladder_7", From: 63, To: 81, Label: "Efektivitas Maksimal"},
			{ID: "ladder_8", From: 71, To: 91, Label: "Produksi Rekor"},
		},
	},
	"agricultural_world": {
		Snakes: []models.Snake{
			{ID: "snake_1", From: 99, To: 77, Label: "Hama Tanaman"},
			{ID: "snake_2", From: 94, To: 64, Label: "Banjir Bandang"},
			{ID: "snake_3", From: 89, To: 49, Label: "Kekeringan"},
			{ID: "snake_4", From: 81, To: 41, Label: "Pupuk Palsu"},
			{ID: "snake_5", From: 72, To: 32, Label: "Penyakit Daun"},
			{ID: "snake_6", From: 62, To: 22, Label: "Tanah Asam"},
			{ID: "snake_7", From: 52, To: 12, Label: "Gulma Liar"},
			{ID: "snake_8", From: 34, To: 4, Label: "Musim Tanam Gagal"},
		},
		Ladders: []models.Ladder{
			{ID: "ladder_1", From: 3, To: 23, Label: "Bibit Unggul"},
			{ID: "ladder_2", From: 11, To: 33, Label: "Pemupukan Tepat"},
			{ID: "ladder_3", From: 18, To: 56, Label: "Irigasi Optimal"},
			{ID: "ladder_4", From: 27, To: 65, Label: "Panen Raya"},
			{ID: "ladder_5", From: 39, To: 57, Label: "Harga Panen Tinggi"},
			{ID: "ladder_6", From: 48, To: 76, Label: "Teknologi Modern"},
			{ID: "ladder_7", From: 59, To: 87, Label: "Ekspor Berhasil"},
			{ID: "ladder_8", From: 68, To: 98, Label: "Petani Sukses"},
		},
	},
	"laboratory_world": {
		Snakes: []models.Snake{
			{ID: "snake_1", From: 97, To: 79, Label: "Kontaminasi Sampel"},
			{ID: "snake_2", From: 93, To: 73, Label: "Alat Rusak"},
			{ID: "snake_3", From: 88, To: 48, Label: "Reaksi Gagal"},
			{ID: "snake_4", From: 82, To: 62, Label: "Kalibrasi Ulang"},
			{ID: "snake_5", From: 77, To: 37, Label: "Data Hilang"},
			{ID: "snake_6", From: 67, To: 27, Label: "Prosedur Salah"},
			{ID: "snake_6b", From: 57, To: 17, Label: "Bahan Habis"},
			{ID: "snake_7", From: 47, To: 7, Label: "Eksperimen Gagal"},
		},
		Ladders: []models.Ladder{
			{ID: "ladder_1", From: 5, To: 25, Label: "Temuan Baru"},
			{ID: "ladder_2", From: 15, To: 35, Label: "Publikasi Jurnal"},
			{ID: "ladder_3", From: 24, To: 44, Label: "Penelitian Berhasil"},
			{ID: "ladder_4", From: 36, To: 74, Label: "Patent Diterima"},
			{ID: "ladder_5", From: 46, To: 86, Label: "Inovasi Terbaik"},
			{ID: "ladder_6", From: 56, To: 96, Label: "Penghargaan Ilmiah"},
			{ID: "ladder_7", From: 66, To: 86, Label: "Kolaborasi Internasional"},
			{ID: "ladder_8", From: 78, To: 98, Label: "Penemuan Besar"},
		},
	},
	"distribution_world": {
		Snakes: []models.Snake{
			{ID: "snake_1", From: 96, To: 76, Label: "Kendaraan Mogok"},
			{ID: "snake_2", From: 91, To: 51, Label: "Jalan Rusak"},
			{ID: "snake_3", From: 86, To: 46, Label: "Kebocoran Gudang"},
			{ID: "snake_4", From: 79, To: 39, Label: "Salah Kirim"},
			{ID: "snake_5", From: 69, To: 29, Label: "Kemacetan Parah"},
			{ID: "snake_6", From: 59, To: 19, Label: "Cuaca Buruk"},
			{ID: "snake_7", From: 49, To: 9, Label: "Stok Habis"},
			{ID: "snake_8", From: 39, To: 9, Label: "Permintaan Turun"},
		},
		Ladders: []models.Ladder{
			{ID: "ladder_1", From: 2, To: 22, Label: "Rute Efisien"},
			{ID: "ladder_2", From: 12, To: 42, Label: "Kendaraan Baru"},
			{ID: "ladder_3", From: 22, To: 52, Label: "Gudang Otomatis"},
			{ID: "ladder_4", From: 32, To: 72, Label: "Jaringan Luas"},
			{ID: "ladder_5", From: 42, To: 82, Label: "Logistik Cepat"},
			{ID: "ladder_6", From: 52, To: 92, Label: "Distribusi Optimal"},
			{ID: "ladder_7", From: 62, To: 82, Label: "Pelanggan Puas"},
			{ID: "ladder_8", From: 72, To: 92, Label: "Pasar Luas"},
		},
	},
	"green_environment_world": {
		Snakes: []models.Snake{
			{ID: "snake_1", From: 98, To: 78, Label: "Pencemaran Udara"},
			{ID: "snake_2", From: 93, To: 63, Label: "Sampah Plastik"},
			{ID: "snake_3", From: 88, To: 58, Label: "Pohon Tumbang"},
			{ID: "snake_4", From: 83, To: 43, Label: "Sungai Tercemar"},
			{ID: "snake_5", From: 74, To: 34, Label: "Iklim Ekstrem"},
			{ID: "snake_6", From: 65, To: 25, Label: "Habitat Hilang"},
			{ID: "snake_7", From: 55, To: 15, Label: "Spesies Punah"},
			{ID: "snake_8", From: 45, To: 5, Label: "Bencana Alam"},
		},
		Ladders: []models.Ladder{
			{ID: "ladder_1", From: 1, To: 21, Label: "Penanaman Pohon"},
			{ID: "ladder_2", From: 13, To: 43, Label: "Daur Ulang Sukses"},
			{ID: "ladder_3", From: 23, To: 53, Label: "Energi Hijau"},
			{ID: "ladder_4", From: 33, To: 73, Label: "Hutan Lestari"},
			{ID: "ladder_5", From: 43, To: 83, Label: "Udara Bersih"},
			{ID: "ladder_6", From: 53, To: 93, Label: "Lingkungan Sehat"},
			{ID: "ladder_7", From: 63, To: 93, Label: "Bumi Hijau"},
			{ID: "ladder_8", From: 73, To: 93, Label: "Masa Depan Cerah"},
		},
	},
}

func (h *GameHandler) HandleRollDice(client *websocket.Client, _ models.RollDicePayload) {
	if client.RoomCode == "" || client.PlayerID == "" {
		return
	}

	room := h.getRoomState(client.RoomCode)
	if room == nil || room.Status != "TURN_START" || currentPlayerID(room) != client.PlayerID {
		h.sendError(client, "NOT_YOUR_TURN", "Bukan giliran Anda.")
		return
	}

	player := h.getPlayerByID(client.PlayerID)
	if player == nil {
		return
	}

	diceValue := rand.Intn(6) + 1
	difficulty := diceValue
	animationSeed := rand.Intn(100000)

	// Select question
	question := h.selectQuestionForRoom(room, difficulty)
	if question == nil {
		h.sendError(client, "NO_QUESTIONS", "Tidak ada pertanyaan aktif yang tersedia untuk dimainkan.")
		return
	}

	now := time.Now()
	timeLimitSec := room.TurnTimeLimitSec
	if question.TimeLimitSec > 0 {
		timeLimitSec = question.TimeLimitSec
	}
	startedAtMs := now.UnixMilli()
	deadlineMs := startedAtMs + int64(timeLimitSec)*1000

	publicQuestion := models.QuestionPublic{
		QuestionID:   question.ID,
		QuestionText: question.QuestionText,
		Category:     question.Category,
		Difficulty:   question.Difficulty,
		TimeLimitSec: timeLimitSec,
		StartedAtMs:  startedAtMs,
		DeadlineMs:   deadlineMs,
		Options:      make([]models.OptionPublic, len(question.Options)),
	}
	for i, opt := range question.Options {
		publicQuestion.Options[i] = models.OptionPublic{ID: opt.ID, Text: opt.Text}
	}

	// Update room to DICE_ROLLING
	turnState := room.TurnState
	turnState.DiceValue = &diceValue
	turnState.AnimationSeed = &animationSeed
	turnState.ActiveQuestion = nil
	turnState.AnsweredOptionID = nil
	turnState.LastAnswerResult = nil
	turnState.LastMovement = nil
	turnStateJSON, _ := json.Marshal(turnState)

	_, err := database.Pool.Exec(context.Background(), `
		UPDATE rooms SET status = $1, turn_state = $2, updated_at = $3 WHERE code = $4
	`, "DICE_ROLLING", turnStateJSON, time.Now(), client.RoomCode)
	if err != nil {
		log.Error().Err(err).Msg("Failed to update room for dice roll")
		return
	}

	// Broadcast DICE_RESULT
	h.hub.BroadcastToRoom(client.RoomCode, models.NewMessage(models.MsgDiceResult, models.DiceResultPayload{
		RoomCode:         client.RoomCode,
		PlayerID:         client.PlayerID,
		DiceValue:        diceValue,
		Difficulty:       difficulty,
		CurrentPosition:  player.Position,
		TargetPosition:   min(100, player.Position+diceValue),
		QuestionID:       question.ID,
		AnimationSeed:    animationSeed,
	}))

	// After dice animation, present question
	go func() {
		time.Sleep(1450 * time.Millisecond)
		h.presentQuestion(client.RoomCode, question, timeLimitSec, startedAtMs, deadlineMs, publicQuestion)
	}()

	// Schedule timeout
	go func() {
		time.Sleep(time.Duration(timeLimitSec)*time.Second + 150*time.Millisecond)
		h.handleQuestionTimeout(client.RoomCode, question.ID)
	}()

	// If bot, schedule auto answer
	if player.IsBot {
		go func() {
			thinkMs := min(timeLimitSec*1000-1500, 1800+rand.Intn(2400))
			time.Sleep(time.Duration(max(1200, thinkMs)) * time.Millisecond)
			h.botAnswer(client.RoomCode, player.ID, question)
		}()
	}
}

func (h *GameHandler) HandleSubmitAnswer(client *websocket.Client, payload models.SubmitAnswerPayload) {
	if client.RoomCode == "" || client.PlayerID == "" {
		return
	}

	room := h.getRoomState(client.RoomCode)
	if room == nil || room.Status != "QUESTION" || room.TurnState.ActiveQuestion == nil {
		h.sendError(client, "QUESTION_CLOSED", "Pertanyaan sudah ditutup.")
		return
	}
	if currentPlayerID(room) != client.PlayerID {
		h.sendError(client, "NOT_YOUR_TURN", "Bukan giliran Anda.")
		return
	}
	if room.TurnState.AnsweredOptionID != nil {
		h.sendError(client, "ALREADY_ANSWERED", "Anda sudah menjawab.")
		return
	}
	if room.TurnState.ActiveQuestion.QuestionID != payload.QuestionID {
		h.sendError(client, "INVALID_PAYLOAD", "Data tidak valid.")
		return
	}

	now := time.Now()
	nowMs := now.UnixMilli()
	if nowMs > room.TurnState.ActiveQuestion.DeadlineMs+350 {
		h.handleQuestionTimeout(client.RoomCode, payload.QuestionID)
		return
	}

	// Get full question
	var question models.Question
	var optionsJSON []byte
	err := database.Pool.QueryRow(context.Background(), `
		SELECT id, question_text, category, difficulty, time_limit_sec, options, correct_option_id, explanation, is_active, created_at
		FROM questions WHERE id = $1
	`, payload.QuestionID).Scan(
		&question.ID, &question.QuestionText, &question.Category, &question.Difficulty, &question.TimeLimitSec, &optionsJSON, &question.CorrectOptionID, &question.Explanation, &question.IsActive, &question.CreatedAt,
	)
	if err != nil {
		h.sendError(client, "INTERNAL", "Pertanyaan tidak ditemukan.")
		return
	}
	json.Unmarshal(optionsJSON, &question.Options)

	// Validate option
	validOption := false
	for _, opt := range question.Options {
		if opt.ID == payload.OptionID {
			validOption = true
			break
		}
	}
	if !validOption {
		h.sendError(client, "INVALID_OPTION", "Opsi tidak valid.")
		return
	}

	answerTimeMs := max(150, nowMs-room.TurnState.ActiveQuestion.StartedAtMs)
	timeLimitMs := int64(room.TurnState.ActiveQuestion.TimeLimitSec) * 1000
	if timeLimitMs <= 0 {
		timeLimitMs = int64(room.TurnTimeLimitSec) * 1000
	}
	if timeLimitMs <= 0 {
		timeLimitMs = 1000
	}
	isCorrect := payload.OptionID == question.CorrectOptionID

	// PRD 3.5 Scoring Formula
	timeFactor := max(0, min(1, 1-float64(answerTimeMs)/float64(timeLimitMs)))
	difficultyMultiplier := 1 + float64(question.Difficulty-1)*0.2
	pointsEarned := int64(0)
	if isCorrect {
		pointsEarned = int64(math.Round(1000 * timeFactor * difficultyMultiplier))
	}

	h.finalizeAnswerAndAdvance(room, question, models.AnswerResult{
		PlayerID:           client.PlayerID,
		QuestionID:         question.ID,
		SelectedOptionID:   payload.OptionID,
		IsCorrect:          isCorrect,
		IsTimeout:          false,
		PointsEarned:       pointsEarned,
		AnswerTimeMs:       answerTimeMs,
		CorrectOptionID:    question.CorrectOptionID,
		Explanation:        question.Explanation,
		TotalScore:         0, // Will be updated
		MovementAllowed:    false,
		Overshoot100:       false,
	})
}

func (h *GameHandler) finalizeAnswerAndAdvance(room *models.Room, question models.Question, outcome models.AnswerResult) {
	player := h.getPlayerByID(outcome.PlayerID)
	if player == nil {
		return
	}

	// Klaim transisi QUESTION -> ANSWER_RESULT secara atomik. Pemain yang
	// menjawab lebih dulu menang; timeout/jawaban berikutnya akan kalah di sini
	// sehingga tidak ada score dobel maupun event ANSWER_RESULT ganda.
	tag, err := database.Pool.Exec(context.Background(), `
		UPDATE rooms SET status = 'ANSWER_RESULT', updated_at = $2
		WHERE code = $1 AND status = 'QUESTION'
	`, room.Code, time.Now())
	if err != nil || tag.RowsAffected() != 1 {
		return
	}

	dice := room.TurnState.DiceValue
	if dice == nil {
		dice = new(int)
		*dice = 1
	}
	willOvershoot := outcome.IsCorrect && player.Position+*dice > 100
	movementAllowed := outcome.IsCorrect && !willOvershoot

	if outcome.IsCorrect {
		player.Score += outcome.PointsEarned
		player.CorrectAnswers++
		player.TotalAnswerTimeMs += outcome.AnswerTimeMs
		outcome.TotalScore = player.Score
		outcome.MovementAllowed = movementAllowed
		outcome.Overshoot100 = willOvershoot

		// Update player in DB
		_, _ = database.Pool.Exec(context.Background(), `
			UPDATE players SET score = $1, correct_answers = $2, total_answer_time_ms = $3 WHERE id = $4
		`, player.Score, player.CorrectAnswers, player.TotalAnswerTimeMs, player.ID)
	}

	// Update room to ANSWER_RESULT
	room.Status = "ANSWER_RESULT"
	room.TurnState.AnsweredOptionID = &outcome.SelectedOptionID
	room.TurnState.LastAnswerResult = &outcome
	turnStateJSON, _ := json.Marshal(room.TurnState)

	_, _ = database.Pool.Exec(context.Background(), `
		UPDATE rooms SET status = $1, turn_state = $2, updated_at = $3 WHERE code = $4
	`, room.Status, turnStateJSON, time.Now(), room.Code)

	// Broadcast ANSWER_RESULT
	h.hub.BroadcastToRoom(room.Code, models.NewMessage(models.MsgAnswerResult, models.AnswerResultPayload{
		RoomCode: room.Code,
		Result:   outcome,
	}))

	// Broadcast LEADERBOARD_UPDATE
	h.broadcastLeaderboard(room.Code)

	// Feedback delay
	feedbackDelay := time.Duration(1450) * time.Millisecond
	if !outcome.IsCorrect {
		feedbackDelay = 2100 * time.Millisecond
	}

	go func() {
		time.Sleep(feedbackDelay)
		h.postAnswerAdvance(room.Code, player.ID, *dice, movementAllowed, willOvershoot)
	}()
}

func (h *GameHandler) postAnswerAdvance(roomCode, playerID string, dice int, movementAllowed, willOvershoot bool) {
	room := h.getRoomState(roomCode)
	if room == nil || room.Status != "ANSWER_RESULT" {
		return
	}

	if !movementAllowed {
		h.advanceToNextTurn(roomCode)
		return
	}

	player := h.getPlayerByID(playerID)
	if player == nil {
		return
	}

	fromPos := player.Position
	toPos := fromPos + dice
	player.Position = toPos

	// Update player position
	_, _ = database.Pool.Exec(context.Background(),
		"UPDATE players SET position = $1 WHERE id = $2", player.Position, player.ID)

	// Update room to MOVING
	movement := models.Movement{
		PlayerID:       player.ID,
		FromPosition:   fromPos,
		ToPosition:     toPos,
		Steps:          dice,
		MovementType:   "NORMAL",
		IsFinished:     toPos == 100,
	}
	room.Status = "MOVING"
	room.TurnState.LastMovement = &movement
	turnStateJSON, _ := json.Marshal(room.TurnState)

	_, _ = database.Pool.Exec(context.Background(), `
		UPDATE rooms SET status = $1, turn_state = $2, updated_at = $3 WHERE code = $4
	`, room.Status, turnStateJSON, time.Now(), roomCode)

	// Broadcast PLAYER_MOVED
	h.hub.BroadcastToRoom(roomCode, models.NewMessage(models.MsgPlayerMoved, models.PlayerMovedPayload{
		RoomCode:      roomCode,
		PlayerID:      player.ID,
		FromPosition:  fromPos,
		ToPosition:    toPos,
		Steps:         dice,
		MovementType:  "NORMAL",
		IsFinished:    toPos == 100,
	}))

	stepAnimMs := max(700, dice*260+250)
	time.Sleep(time.Duration(stepAnimMs) * time.Millisecond)

	h.checkBoardEffectsOrFinish(roomCode, player.ID)
}

func (h *GameHandler) checkBoardEffectsOrFinish(roomCode, playerID string) {
	room := h.getRoomState(roomCode)
	if room == nil || room.Status != "MOVING" {
		return
	}
	player := h.getPlayerByID(playerID)
	if player == nil {
		return
	}

	if player.Position >= 100 {
		player.Position = 100
		_, _ = database.Pool.Exec(context.Background(),
			"UPDATE players SET position = 100 WHERE id = $1", player.ID)
		h.finishGame(room, player)
		return
	}

	mapConfig := mapConfigs[room.MapID]
	// Check ladder
	for _, ladder := range mapConfig.Ladders {
		if ladder.From == player.Position {
			h.triggerLadder(room, player, ladder)
			return
		}
	}
	// Check snake
	for _, snake := range mapConfig.Snakes {
		if snake.From == player.Position {
			h.triggerSnake(room, player, snake)
			return
		}
	}

	h.broadcastLeaderboard(roomCode)
	h.advanceToNextTurn(roomCode)
}

func (h *GameHandler) triggerLadder(room *models.Room, player *models.Player, ladder models.Ladder) {
	fromPos := player.Position
	player.Position = ladder.To
	_, _ = database.Pool.Exec(context.Background(),
		"UPDATE players SET position = $1 WHERE id = $2", player.Position, player.ID)

	room.Status = "LADDER_ANIMATION"
	movement := models.Movement{
		PlayerID:       player.ID,
		FromPosition:   fromPos,
		ToPosition:     ladder.To,
		Steps:          ladder.To - fromPos,
		MovementType:   "LADDER",
		EdgeID:         ladder.ID,
		IsFinished:     ladder.To == 100,
	}
	room.TurnState.LastMovement = &movement
	turnStateJSON, _ := json.Marshal(room.TurnState)

	_, _ = database.Pool.Exec(context.Background(), `
		UPDATE rooms SET status = $1, turn_state = $2, updated_at = $3 WHERE code = $4
	`, room.Status, turnStateJSON, time.Now(), room.Code)

	// Broadcast LADDER_TRIGGERED
	h.hub.BroadcastToRoom(room.Code, models.NewMessage(models.MsgLadderTriggered, models.LadderTriggeredPayload{
		RoomCode:      room.Code,
		PlayerID:      player.ID,
		LadderID:      ladder.ID,
		Label:         ladder.Label,
		FromPosition:  fromPos,
		ToPosition:    ladder.To,
	}))

	// Broadcast LEADERBOARD_UPDATE
	h.broadcastLeaderboard(room.Code)

	go func() {
		time.Sleep(1200 * time.Millisecond)
		if player.Position >= 100 {
			r := h.getRoomState(room.Code)
			if r != nil {
				h.finishGame(r, player)
			}
		} else {
			h.advanceToNextTurn(room.Code)
		}
	}()
}

func (h *GameHandler) triggerSnake(room *models.Room, player *models.Player, snake models.Snake) {
	fromPos := player.Position
	player.Position = snake.To
	_, _ = database.Pool.Exec(context.Background(),
		"UPDATE players SET position = $1 WHERE id = $2", player.Position, player.ID)

	room.Status = "SNAKE_ANIMATION"
	movement := models.Movement{
		PlayerID:       player.ID,
		FromPosition:   fromPos,
		ToPosition:     snake.To,
		Steps:          fromPos - snake.To,
		MovementType:   "SNAKE",
		EdgeID:         snake.ID,
		IsFinished:     false,
	}
	room.TurnState.LastMovement = &movement
	turnStateJSON, _ := json.Marshal(room.TurnState)

	_, _ = database.Pool.Exec(context.Background(), `
		UPDATE rooms SET status = $1, turn_state = $2, updated_at = $3 WHERE code = $4
	`, room.Status, turnStateJSON, time.Now(), room.Code)

	// Broadcast SNAKE_TRIGGERED
	h.hub.BroadcastToRoom(room.Code, models.NewMessage(models.MsgSnakeTriggered, models.SnakeTriggeredPayload{
		RoomCode:      room.Code,
		PlayerID:      player.ID,
		SnakeID:       snake.ID,
		Label:         snake.Label,
		FromPosition:  fromPos,
		ToPosition:    snake.To,
	}))

	// Broadcast LEADERBOARD_UPDATE
	h.broadcastLeaderboard(room.Code)

	go func() {
		time.Sleep(1200 * time.Millisecond)
		h.advanceToNextTurn(room.Code)
	}()
}

func (h *GameHandler) advanceToNextTurn(roomCode string) {
	room := h.getRoomState(roomCode)
	if room == nil || room.Status == "GAME_OVER" {
		return
	}

	players := h.getPlayersByRoomCode(roomCode)
	if len(players) == 0 {
		return
	}

	currentIdx := -1
	for i, p := range players {
		if p.ID == currentPlayerID(room) {
			currentIdx = i
			break
		}
	}
	if currentIdx == -1 {
		currentIdx = 0
	}
	nextIdx := (currentIdx + 1) % len(players)
	nextPlayer := players[nextIdx]

	room.Status = "TURN_END"
	turnStateJSON, _ := json.Marshal(room.TurnState)
	_, _ = database.Pool.Exec(context.Background(), `
		UPDATE rooms SET status = $1, turn_state = $2, updated_at = $3 WHERE code = $4
	`, room.Status, turnStateJSON, time.Now(), roomCode)

	go func() {
		time.Sleep(450 * time.Millisecond)
		r := h.getRoomState(roomCode)
		if r == nil || r.Status == "GAME_OVER" {
			return
		}

		r.Status = "TURN_START"
		r.CurrentTurn++
		// Room.CurrentPlayerID adalah *string (kolom UUID nullable).
		nextPlayerID := nextPlayer.ID
		r.CurrentPlayerID = &nextPlayerID
		r.TurnState = models.TurnState{
			TurnNumber:       r.CurrentTurn,
			CurrentPlayerID:  nextPlayer.ID,
			DiceValue:        nil,
			AnimationSeed:    nil,
			ActiveQuestion:   nil,
			AnsweredOptionID: nil,
			LastAnswerResult: nil,
			LastMovement:     nil,
			UsedQuestionIDs:  r.TurnState.UsedQuestionIDs,
			TurnStartedAtMs:  time.Now().UnixMilli(),
		}
		turnStateJSON, _ := json.Marshal(r.TurnState)

		_, _ = database.Pool.Exec(context.Background(), `
			UPDATE rooms SET status = $1, current_turn = $2, current_player_id = $3, turn_state = $4, updated_at = $5 WHERE code = $6
		`, r.Status, r.CurrentTurn, nextPlayerID, turnStateJSON, time.Now(), roomCode)

		// Broadcast TURN_CHANGED
		h.hub.BroadcastToRoom(roomCode, models.NewMessage(models.MsgTurnChanged, models.TurnChangedPayload{
			RoomCode:            roomCode,
			TurnNumber:          r.CurrentTurn,
			PreviousPlayerID:    currentPlayerID(room),
			CurrentPlayerID:     nextPlayer.ID,
			CurrentPlayerNickname: nextPlayer.Nickname,
		}))

		// Broadcast TURN_STARTED
		h.hub.BroadcastToRoom(roomCode, models.NewMessage(models.MsgTurnStarted, models.TurnStartedPayload{
			RoomCode:             roomCode,
			TurnNumber:           r.CurrentTurn,
			CurrentPlayerID:      nextPlayer.ID,
			CurrentPlayerNickname: nextPlayer.Nickname,
			Position:             nextPlayer.Position,
			TurnStartedAt:        time.Now().UnixMilli(),
		}))

		h.maybeTriggerBotTurn(roomCode)
	}()
}

// MaybeTriggerBotTurn dipanggil dari RoomHandler lewat callback di main.go.
func (h *GameHandler) MaybeTriggerBotTurn(roomCode string) {
	h.maybeTriggerBotTurn(roomCode)
}

func (h *GameHandler) maybeTriggerBotTurn(roomCode string) {
	room := h.getRoomState(roomCode)
	if room == nil || room.Status != "TURN_START" || room.CurrentPlayerID == nil {
		return
	}
	player := h.getPlayerByID(*room.CurrentPlayerID)
	if player == nil || !player.IsBot {
		return
	}

	go func() {
		time.Sleep(1150 * time.Millisecond)
		h.HandleRollDice(h.botClient(roomCode, player.ID), models.RollDicePayload{})
	}()
}

func (h *GameHandler) handleQuestionTimeout(roomCode, questionID string) {
	room := h.getRoomState(roomCode)
	if room == nil || room.Status != "QUESTION" || room.TurnState.ActiveQuestion == nil {
		return
	}
	if room.TurnState.ActiveQuestion.QuestionID != questionID {
		return
	}
	if room.TurnState.AnsweredOptionID != nil {
		return
	}

	// Get full question for correct option
	var question models.Question
	var optionsJSON []byte
	err := database.Pool.QueryRow(context.Background(), `
		SELECT id, question_text, category, difficulty, time_limit_sec, options, correct_option_id, explanation, is_active, created_at
		FROM questions WHERE id = $1
	`, questionID).Scan(
		&question.ID, &question.QuestionText, &question.Category, &question.Difficulty, &question.TimeLimitSec, &optionsJSON, &question.CorrectOptionID, &question.Explanation, &question.IsActive, &question.CreatedAt,
	)
	if err != nil {
		return
	}
	json.Unmarshal(optionsJSON, &question.Options)

	playerID := currentPlayerID(room)
	if playerID == "" {
		return
	}

	h.finalizeAnswerAndAdvance(room, question, models.AnswerResult{
		PlayerID:           playerID,
		QuestionID:         question.ID,
		SelectedOptionID:   "__TIMEOUT__",
		IsCorrect:          false,
		IsTimeout:          true,
		PointsEarned:       0,
		AnswerTimeMs:       int64(room.TurnState.ActiveQuestion.TimeLimitSec) * 1000,
		CorrectOptionID:    question.CorrectOptionID,
		Explanation:        question.Explanation,
		TotalScore:         0,
		MovementAllowed:    false,
		Overshoot100:       false,
	})
}

func (h *GameHandler) botAnswer(roomCode, playerID string, question *models.Question) {
	if question == nil {
		return
	}
	room := h.getRoomState(roomCode)
	if room == nil || room.Status != "QUESTION" || room.TurnState.ActiveQuestion == nil {
		return
	}
	if room.TurnState.ActiveQuestion.QuestionID != question.ID {
		return
	}
	if room.TurnState.AnsweredOptionID != nil {
		return
	}

	// Ambil versi lengkap soal (termasuk opsi) dari database.
	// Jangan reuse nama `question` — parameter fungsi sudah memakai nama itu.
	var fullQuestion models.Question
	var optionsJSON []byte
	err := database.Pool.QueryRow(context.Background(), `
		SELECT id, question_text, category, difficulty, time_limit_sec, options, correct_option_id, explanation, is_active, created_at
		FROM questions WHERE id = $1
	`, question.ID).Scan(
		&fullQuestion.ID, &fullQuestion.QuestionText, &fullQuestion.Category, &fullQuestion.Difficulty, &fullQuestion.TimeLimitSec, &optionsJSON, &fullQuestion.CorrectOptionID, &fullQuestion.Explanation, &fullQuestion.IsActive, &fullQuestion.CreatedAt,
	)
	if err != nil {
		return
	}
	json.Unmarshal(optionsJSON, &fullQuestion.Options)
	question = &fullQuestion

	difficulty := question.Difficulty
	correctRate := max(0.45, 0.85-float64(difficulty)*0.06)
	willAnswerRight := rand.Float64() < correctRate

	var chosenOpt string
	if willAnswerRight {
		chosenOpt = question.CorrectOptionID
	} else {
		for _, opt := range question.Options {
			if opt.ID != question.CorrectOptionID {
				chosenOpt = opt.ID
				break
			}
		}
		if chosenOpt == "" {
			chosenOpt = question.Options[0].ID
		}
	}

	h.HandleSubmitAnswer(h.botClient(roomCode, playerID), models.SubmitAnswerPayload{
		QuestionID: question.ID,
		OptionID:   chosenOpt,
	})
}

func (h *GameHandler) selectQuestionForRoom(room *models.Room, difficulty int) *models.Question {
	var query string
	var args []interface{}

	if room.QuestionMode == "CUSTOM" && room.QuestionSetID != nil {
		// Get question IDs from set
		var questionIDs []uuid.UUID
		err := database.Pool.QueryRow(context.Background(),
			"SELECT question_ids FROM question_sets WHERE id = $1", *room.QuestionSetID).Scan(&questionIDs)
		if err != nil || len(questionIDs) == 0 {
			return nil
		}

		placeholders := make([]string, len(questionIDs))
		for i, id := range questionIDs {
			placeholders[i] = fmt.Sprintf("$%d", i+2)
			args = append(args, id)
		}
		query = fmt.Sprintf(`
			SELECT id, question_text, category, difficulty, time_limit_sec, options, correct_option_id, explanation, is_active, created_at
			FROM questions WHERE is_active = true AND id IN (%s)
			ORDER BY ABS(difficulty - $1), RANDOM() LIMIT 1
		`, strings.Join(placeholders, ","))
		args = append([]interface{}{difficulty}, args...)
	} else {
		query = `
			SELECT id, question_text, category, difficulty, time_limit_sec, options, correct_option_id, explanation, is_active, created_at
			FROM questions WHERE is_active = true
		`
		args = []interface{}{}
		argIdx := 1

		if len(room.Categories) > 0 {
			placeholders := make([]string, len(room.Categories))
			for i, cat := range room.Categories {
				placeholders[i] = fmt.Sprintf("$%d", argIdx+i)
				args = append(args, cat)
			}
			query += " AND category IN (" + strings.Join(placeholders, ",") + ")"
			argIdx += len(room.Categories)
		}

		query += fmt.Sprintf(" ORDER BY ABS(difficulty - $%d), RANDOM() LIMIT 1", argIdx)
		args = append(args, difficulty)
	}

	var question models.Question
	var optionsJSON []byte
	err := database.Pool.QueryRow(context.Background(), query, args...).Scan(
		&question.ID, &question.QuestionText, &question.Category, &question.Difficulty, &question.TimeLimitSec, &optionsJSON, &question.CorrectOptionID, &question.Explanation, &question.IsActive, &question.CreatedAt,
	)
	if err != nil {
		return nil
	}
	json.Unmarshal(optionsJSON, &question.Options)
	return &question
}

func (h *GameHandler) presentQuestion(roomCode string, question *models.Question, timeLimitSec int, startedAtMs, deadlineMs int64, publicQuestion models.QuestionPublic) {
	room := h.getRoomState(roomCode)
	if room == nil || room.Status != "DICE_ROLLING" {
		return
	}

	room.Status = "QUESTION"
	room.TurnState.ActiveQuestion = &publicQuestion
	if !contains(room.TurnState.UsedQuestionIDs, question.ID) {
		room.TurnState.UsedQuestionIDs = append(room.TurnState.UsedQuestionIDs, question.ID)
	}
	turnStateJSON, _ := json.Marshal(room.TurnState)

	_, _ = database.Pool.Exec(context.Background(), `
		UPDATE rooms SET status = $1, turn_state = $2, updated_at = $3 WHERE code = $4
	`, room.Status, turnStateJSON, time.Now(), roomCode)

	// Broadcast QUESTION_STARTED
	h.hub.BroadcastToRoom(roomCode, models.NewMessage(models.MsgQuestionStarted, models.QuestionStartedPayload{
		RoomCode:  roomCode,
		PlayerID:  currentPlayerID(room),
		Question:  publicQuestion,
		DeadlineMs: deadlineMs,
	}))
}

func (h *GameHandler) finishGame(room *models.Room, winnerPlayer *models.Player) {
	room.Status = "GAME_OVER"
	turnStateJSON, _ := json.Marshal(room.TurnState)
	_, _ = database.Pool.Exec(context.Background(), `
		UPDATE rooms SET status = $1, turn_state = $2, updated_at = $3 WHERE code = $4
	`, room.Status, turnStateJSON, time.Now(), room.Code)

	leaderboard := h.computeLeaderboard(room.Code, winnerPlayer.ID)
	winnerEntry := h.findLeaderboardEntry(leaderboard, winnerPlayer.ID)
	if winnerEntry == nil && len(leaderboard) > 0 {
		winnerEntry = leaderboard[0]
	}

	result := models.GameResult{
		RoomCode:    room.Code,
		RoomName:    room.Name,
		MapID:       room.MapID,
		Winner:      winnerEntry,
		Leaderboard: leaderboard,
		TotalTurns:  room.CurrentTurn,
		EndedAt:     time.Now().Format(time.RFC3339),
	}

	// Save game result
	leaderboardJSON, _ := json.Marshal(leaderboard)
	_, _ = database.Pool.Exec(context.Background(), `
		INSERT INTO game_results (room_id, room_name, map_id, winner_id, leaderboard, total_turns, ended_at)
		VALUES ((SELECT id FROM rooms WHERE code = $1), $2, $3, $4, $5, $6, $7)
	`, room.Code, room.Name, room.MapID, winnerPlayer.ID, leaderboardJSON, room.CurrentTurn, result.EndedAt)

	// Broadcast GAME_OVER
	h.hub.BroadcastToRoom(room.Code, models.NewMessage(models.MsgGameOver, models.GameOverPayload{
		RoomCode: room.Code,
		Result:   result,
	}))

	log.Info().Str("room", room.Code).Str("winner", winnerPlayer.Nickname).Msg("Game finished")
}

func (h *GameHandler) computeLeaderboard(roomCode string, explicitWinnerID ...string) []models.LeaderboardEntry {
	players := h.getPlayersByRoomCode(roomCode)
	var winnerID string
	if len(explicitWinnerID) > 0 {
		winnerID = explicitWinnerID[0]
	}

	sorted := make([]*models.Player, len(players))
	copy(sorted, players)

	// Sort: reached 100 winner first, then score DESC, correct_answers DESC, total_answer_time_ms ASC
	sortPlayers(sorted, winnerID)

	leaderboard := make([]models.LeaderboardEntry, len(sorted))
	for i, p := range sorted {
		leaderboard[i] = models.LeaderboardEntry{
			Rank:               i + 1,
			PlayerID:           p.ID,
			Nickname:           p.Nickname,
			CharacterID:        p.CharacterID,
			Position:           p.Position,
			Score:              p.Score,
			CorrectAnswers:     p.CorrectAnswers,
			TotalAnswerTimeMs:  p.TotalAnswerTimeMs,
			IsBot:              p.IsBot,
		}
	}
	return leaderboard
}

func (h *GameHandler) broadcastLeaderboard(roomCode string) {
	leaderboard := h.computeLeaderboard(roomCode)
	h.hub.BroadcastToRoom(roomCode, models.NewMessage(models.MsgLeaderboardUpdate, models.LeaderboardUpdatePayload{
		RoomCode:    roomCode,
		Leaderboard: leaderboard,
	}))
}

func (h *GameHandler) getRoomState(code string) *models.Room {
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

func (h *GameHandler) getPlayerByID(id string) *models.Player {
	var p models.Player
	err := database.Pool.QueryRow(context.Background(), `
		SELECT id, room_id, player_token, nickname, character_id, position, score, correct_answers, total_answer_time_ms, is_ready, is_connected, is_bot, is_spectator, joined_at
		FROM players WHERE id = $1
	`, id).Scan(&p.ID, &p.RoomID, &p.PlayerToken, &p.Nickname, &p.CharacterID, &p.Position, &p.Score, &p.CorrectAnswers, &p.TotalAnswerTimeMs, &p.IsReady, &p.IsConnected, &p.IsBot, &p.IsSpectator, &p.JoinedAt)
	if err != nil {
		return nil
	}
	return &p
}

func (h *GameHandler) getPlayersByRoomCode(code string) []*models.Player {
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

func (h *GameHandler) findLeaderboardEntry(leaderboard []models.LeaderboardEntry, playerID string) *models.LeaderboardEntry {
	for i := range leaderboard {
		if leaderboard[i].PlayerID == playerID {
			return &leaderboard[i]
		}
	}
	return nil
}

func (h *GameHandler) sendError(client *websocket.Client, code, message string) {
	h.hub.SendToClient(client, models.NewMessage(models.MsgError, models.ErrorPayload{
		Code:    code,
		Message: message,
	}))
}

// Helper functions
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func sortPlayers(players []*models.Player, explicitWinnerID string) {
	// Sort by: explicit winner first, then position 100, score DESC, correct_answers DESC, total_answer_time_ms ASC
	for i := 0; i < len(players)-1; i++ {
		for j := i + 1; j < len(players); j++ {
			if shouldComeFirst(players[j], players[i], explicitWinnerID) {
				players[i], players[j] = players[j], players[i]
			}
		}
	}
}

func shouldComeFirst(a, b *models.Player, explicitWinnerID string) bool {
	if explicitWinnerID != "" {
		if a.ID == explicitWinnerID {
			return true
		}
		if b.ID == explicitWinnerID {
			return false
		}
	}
	// Check if reached 100 (winner)
	aReached100 := a.Position >= 100
	bReached100 := b.Position >= 100
	if aReached100 && !bReached100 {
		return true
	}
	if bReached100 && !aReached100 {
		return false
	}
	if a.Score != b.Score {
		return a.Score > b.Score
	}
	if a.CorrectAnswers != b.CorrectAnswers {
		return a.CorrectAnswers > b.CorrectAnswers
	}
	return a.TotalAnswerTimeMs < b.TotalAnswerTimeMs
}