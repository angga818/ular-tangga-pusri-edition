import { CHARACTERS, MAP_THEMES } from '../data/mapsAndChars';
import {
  reloadSqlFromStorage,
  sqlAddPlayer,
  sqlCreateRoom,
  sqlGetGameResult,
  sqlGetMaps,
  sqlGetPlayers,
  sqlGetQuestions,
  sqlGetQuestionSets,
  sqlGetRoom,
  sqlRemovePlayer,
  sqlSaveGameResult,
  sqlSaveRoom,
  sqlUpdatePlayer,
} from '../db/sqlDatabase';
import {
  GameLogItem,
  GameResult,
  LeaderboardEntry,
  MapTheme,
  Player,
  Question,
  QuestionCategory,
  QuestionMode,
  QuestionPublic,
  Room,
  WSEventEnvelope,
} from '../types/game';

const CHANNEL_NAME = 'pusri_ular_tangga_ws_v1';

type EventListener = (env: WSEventEnvelope<unknown>) => void;

class AuthoritativeGameServer {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<EventListener> = new Set();
  private processedEventIds: Set<string> = new Set();
  private activeTimers: Map<string, number> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (msg) => {
        const env = msg.data as WSEventEnvelope<unknown>;
        if (!env || !env.event_id) return;
        if (this.processedEventIds.has(env.event_id)) return;
        this.processedEventIds.add(env.event_id);
        reloadSqlFromStorage();
        this.listeners.forEach((cb) => cb(env));
      };
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'pusri_ulartangga_sql_store_v1') {
          reloadSqlFromStorage();
          this.listeners.forEach((cb) =>
            cb({
              event: 'STATE_SYNC',
              payload: { externalStorageSync: true },
              event_id: `sync_${Date.now()}_${Math.random()}`,
              timestamp: Date.now(),
            })
          );
        }
      });
    }
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit<T>(event: string, payload: T) {
    const env: WSEventEnvelope<T> = {
      event,
      payload,
      event_id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    this.processedEventIds.add(env.event_id);
    if (this.processedEventIds.size > 400) {
      const first = this.processedEventIds.values().next().value;
      if (first) this.processedEventIds.delete(first);
    }
    this.listeners.forEach((cb) => cb(env));
    this.channel?.postMessage(env);
  }

  private clearTimer(key: string) {
    const existing = this.activeTimers.get(key);
    if (existing !== undefined) {
      window.clearTimeout(existing);
      this.activeTimers.delete(key);
    }
  }

  private setTimer(key: string, delayMs: number, fn: () => void) {
    this.clearTimer(key);
    const id = window.setTimeout(() => {
      this.activeTimers.delete(key);
      fn();
    }, delayMs);
    this.activeTimers.set(key, id);
  }

  // === REST-equivalent Endpoints ===

  createRoom(params: {
    room_name: string;
    host_nickname: string;
    map_id: string;
    max_players: number;
    question_mode: QuestionMode;
    question_set_id: string | null;
    categories: QuestionCategory[];
    turn_time_limit_sec: number;
  }): { room: Room; hostPlayer: Player } {
    if (!params.room_name.trim()) throw new Error('Nama room wajib diisi.');
    if (params.max_players < 2 || params.max_players > 8) {
      throw new Error('Maksimal pemain harus antara 2 dan 8.');
    }
    if (params.turn_time_limit_sec < 5 || params.turn_time_limit_sec > 60) {
      throw new Error('Durasi menjawab harus antara 5 dan 60 detik.');
    }
    const maps = sqlGetMaps();
    if (!maps.some((m) => m.id === params.map_id)) {
      throw new Error('Tema peta tidak tersedia.');
    }
    if (params.question_mode === 'CUSTOM') {
      if (!params.question_set_id) throw new Error('Pilih Question Set untuk mode custom.');
      const sets = sqlGetQuestionSets();
      const found = sets.find((s) => s.id === params.question_set_id);
      if (!found || found.question_ids.length === 0) {
        throw new Error('Question Set tidak valid atau kosong.');
      }
    } else {
      const activeQuestions = sqlGetQuestions({ activeOnly: true });
      const filtered =
        params.categories.length > 0
          ? activeQuestions.filter((q) => params.categories.includes(q.category))
          : activeQuestions;
      if (filtered.length < 3) {
        throw new Error('Minimal tersedia 3 pertanyaan aktif pada kategori yang dipilih.');
      }
    }

    const room = sqlCreateRoom(params);

    // Host adalah pemain pertama di room dan otomatis berstatus siap.
    const hostPlayer = sqlAddPlayer({
      room_code: room.code,
      nickname: params.host_nickname.trim() || 'Host',
      character_id: CHARACTERS[0].id,
      is_bot: false,
      is_ready: true,
    });

    this.emit('ROOM_STATE', { room_code: room.code, status: room.status });
    return { room, hostPlayer };
  }

  joinRoom(params: {
    room_code: string;
    nickname: string;
    character_id: string;
  }): { player: Player; room: Room } {
    reloadSqlFromStorage();
    const code = params.room_code.trim();
    const nickname = params.nickname.trim();

    if (!/^\d{6}$/.test(code)) {
      throw new Error('Kode PIN room harus terdiri dari 6 digit angka.');
    }
    if (nickname.length < 1 || nickname.length > 20) {
      throw new Error('Nickname wajib diisi (1–20 karakter).');
    }

    const room = sqlGetRoom(code);
    if (!room) {
      throw new Error('NOT_FOUND: Room dengan kode PIN tersebut tidak ditemukan.');
    }
    if (room.status !== 'LOBBY') {
      throw new Error('ROOM_ALREADY_STARTED: Permainan di room ini sudah dimulai.');
    }

    const players = sqlGetPlayers(code);
    if (players.length >= room.max_players) {
      throw new Error('ROOM_FULL: Kapasitas room sudah penuh.');
    }
    if (players.some((p) => p.nickname.toLowerCase() === nickname.toLowerCase())) {
      throw new Error('NICKNAME_TAKEN: Nickname sudah digunakan di room ini.');
    }
    if (!CHARACTERS.some((c) => c.id === params.character_id)) {
      throw new Error('Karakter yang dipilih tidak valid.');
    }

    const player = sqlAddPlayer({
      room_code: code,
      nickname,
      character_id: params.character_id,
      is_bot: false,
      is_ready: false,
    });

    this.emit('PLAYER_JOINED', { room_code: code, player });
    return { player, room };
  }

  addBotPlayer(room_code: string): Player {
    const room = sqlGetRoom(room_code);
    if (!room) throw new Error('Room tidak ditemukan.');
    if (room.status !== 'LOBBY') throw new Error('Permainan sudah dimulai.');
    const players = sqlGetPlayers(room_code);
    if (players.length >= room.max_players) throw new Error('Kapasitas room penuh.');

    const botNames = ['Budi (Bot)', 'Sinta (Bot)', 'Andi (Bot)', 'Dewi (Bot)', 'Fajar (Bot)', 'Tari (Bot)', 'Hendra (Bot)'];
    const usedNames = new Set(players.map((p) => p.nickname.toLowerCase()));
    const availableName =
      botNames.find((n) => !usedNames.has(n.toLowerCase())) || `Rekan ${players.length + 1} (Bot)`;

    const usedChars = new Set(players.map((p) => p.character_id));
    const char = CHARACTERS.find((c) => !usedChars.has(c.id)) || CHARACTERS[players.length % CHARACTERS.length];

    const bot = sqlAddPlayer({
      room_code,
      nickname: availableName,
      character_id: char.id,
      is_bot: true,
      is_ready: true,
    });
    this.emit('PLAYER_JOINED', { room_code, player: bot });
    return bot;
  }

  removePlayer(room_code: string, player_id: string) {
    const room = sqlGetRoom(room_code);
    if (!room || room.status !== 'LOBBY') return;
    sqlRemovePlayer(player_id);
    this.emit('PLAYER_LEFT', { room_code, player_id });
  }

  setPlayerReady(room_code: string, player_id: string, ready: boolean) {
    reloadSqlFromStorage();
    const players = sqlGetPlayers(room_code);
    const target = players.find((p) => p.id === player_id);
    if (!target) throw new Error('Pemain tidak ditemukan.');
    target.is_ready = ready;
    sqlUpdatePlayer(target);
    this.emit('PLAYER_READY_UPDATE', { room_code, player_id, ready });
  }

  setPlayerConnection(room_code: string, player_id: string, connected: boolean) {
    const players = sqlGetPlayers(room_code);
    const target = players.find((p) => p.id === player_id);
    if (!target) return;
    target.is_connected = connected;
    sqlUpdatePlayer(target);
    this.emit('STATE_SYNC', { room_code });
  }

  changeRoomMap(room_code: string, map_id: string) {
    const room = sqlGetRoom(room_code);
    if (!room || room.status !== 'LOBBY') return;
    room.map_id = map_id;
    sqlSaveRoom(room);
    this.emit('ROOM_STATE', { room_code, map_id });
  }

  // === Game Lifecycle ===

  startGame(room_code: string, host_token: string) {
    reloadSqlFromStorage();
    const room = sqlGetRoom(room_code);
    if (!room) throw new Error('Room tidak ditemukan.');
    if (room.host_token !== host_token) throw new Error('UNAUTHORIZED: Hanya host yang dapat memulai.');
    if (room.status !== 'LOBBY') throw new Error('Permainan sudah berlangsung.');

    const players = sqlGetPlayers(room_code);
    if (players.length < 2) {
      throw new Error('Minimal 2 pemain harus bergabung untuk memulai permainan.');
    }
    if (players.some((p) => !p.is_ready)) {
      throw new Error('Semua pemain harus berstatus Siap (Ready) terlebih dahulu.');
    }

    const firstPlayer = players[0];
    room.status = 'STARTING';
    room.current_turn = 1;
    room.current_player_id = firstPlayer.id;
    room.turn_state = {
      turn_number: 1,
      current_player_id: firstPlayer.id,
      dice_value: null,
      animation_seed: null,
      active_question: null,
      answered_option_id: null,
      last_answer_result: null,
      last_movement: null,
      used_question_ids: [],
      turn_started_at_ms: Date.now(),
    };
    sqlSaveRoom(room);

    this.emit('GAME_STARTED', { room_code });

    this.setTimer(`start_${room_code}`, 700, () => {
      const r = sqlGetRoom(room_code);
      if (!r || r.status !== 'STARTING') return;
      r.status = 'TURN_START';
      r.turn_state.turn_started_at_ms = Date.now();
      sqlSaveRoom(r);
      this.emit('TURN_STARTED', {
        room_code,
        turn_number: r.current_turn,
        current_player_id: firstPlayer.id,
        current_player_nickname: firstPlayer.nickname,
        position: firstPlayer.position,
        turn_started_at: Date.now(),
      });
      this.maybeTriggerBotTurn(room_code);
    });
  }

  private maybeTriggerBotTurn(room_code: string) {
    const room = sqlGetRoom(room_code);
    if (!room || room.status !== 'TURN_START' || !room.current_player_id) return;
    const players = sqlGetPlayers(room_code);
    const current = players.find((p) => p.id === room.current_player_id);
    if (!current || !current.is_bot) return;

    this.setTimer(`bot_roll_${room_code}`, 1150, () => {
      try {
        this.rollDice(room_code, current.id);
      } catch {
        // ignore if state moved
      }
    });
  }

  rollDice(room_code: string, player_id: string) {
    reloadSqlFromStorage();
    const room = sqlGetRoom(room_code);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.status !== 'TURN_START') throw new Error('INVALID_STATE: Dadu hanya bisa dilempar saat giliran dimulai.');
    if (room.current_player_id !== player_id) throw new Error('NOT_YOUR_TURN: Bukan giliran Anda.');

    const players = sqlGetPlayers(room_code);
    const player = players.find((p) => p.id === player_id);
    if (!player) throw new Error('PLAYER_NOT_FOUND');

    const dice_value = Math.floor(Math.random() * 6) + 1;
    const difficulty = dice_value as 1 | 2 | 3 | 4 | 5 | 6;
    const animation_seed = Math.floor(Math.random() * 100000);

    const pickedQuestion = this.selectQuestionForRoom(room, difficulty);
    if (!pickedQuestion) {
      throw new Error('Tidak ada pertanyaan aktif yang tersedia untuk dimainkan.');
    }

    room.status = 'DICE_ROLLING';
    room.turn_state = {
      ...room.turn_state,
      dice_value,
      animation_seed,
      active_question: null,
      answered_option_id: null,
      last_answer_result: null,
      last_movement: null,
    };
    sqlSaveRoom(room);

    this.emit('DICE_RESULT', {
      room_code,
      player_id,
      dice_value,
      difficulty,
      current_position: player.position,
      target_position: Math.min(100, player.position + dice_value),
      question_id: pickedQuestion.id,
      animation_seed,
    });

    // After 1.5s dice roll animation, present the question
    this.setTimer(`dice_to_q_${room_code}`, 1450, () => {
      reloadSqlFromStorage();
      const r = sqlGetRoom(room_code);
      if (!r || r.status !== 'DICE_ROLLING') return;

      const timeLimitSec = r.turn_time_limit_sec || pickedQuestion.time_limit_sec;
      const started_at_ms = Date.now();
      const deadline_ms = started_at_ms + timeLimitSec * 1000;

      const publicQuestion: QuestionPublic = {
        question_id: pickedQuestion.id,
        question_text: pickedQuestion.question_text,
        category: pickedQuestion.category,
        difficulty: pickedQuestion.difficulty,
        time_limit_sec: timeLimitSec,
        started_at_ms,
        deadline_ms,
        options: pickedQuestion.options.map((o) => ({ id: o.id, text: o.text })),
      };

      r.status = 'QUESTION';
      r.turn_state.active_question = publicQuestion;
      if (!r.turn_state.used_question_ids.includes(pickedQuestion.id)) {
        r.turn_state.used_question_ids = [...r.turn_state.used_question_ids, pickedQuestion.id];
      }
      sqlSaveRoom(r);

      this.emit('QUESTION_STARTED', {
        room_code,
        player_id,
        question: publicQuestion,
      });

      // Schedule authoritative server timeout
      this.setTimer(`q_timeout_${room_code}`, timeLimitSec * 1000 + 150, () => {
        this.handleQuestionTimeout(room_code, pickedQuestion.id);
      });

      // If bot, schedule automatic answer
      if (player.is_bot) {
        const thinkMs = Math.min(timeLimitSec * 1000 - 1500, 1800 + Math.floor(Math.random() * 2400));
        this.setTimer(`bot_ans_${room_code}`, Math.max(1200, thinkMs), () => {
          const correctRate = Math.max(0.45, 0.85 - difficulty * 0.06);
          const willAnswerRight = Math.random() < correctRate;
          const chosenOpt = willAnswerRight
            ? pickedQuestion.correct_option_id
            : (pickedQuestion.options.find((o) => o.id !== pickedQuestion.correct_option_id) || pickedQuestion.options[0]).id;
          try {
            this.submitAnswer(room_code, player.id, pickedQuestion.id, chosenOpt);
          } catch {
            // ignore
          }
        });
      }
    });
  }

  private selectQuestionForRoom(room: Room, difficulty: number): Question | null {
    const allActive = sqlGetQuestions({ activeOnly: true });
    let pool: Question[] = [];

    if (room.question_mode === 'CUSTOM' && room.question_set_id) {
      const sets = sqlGetQuestionSets();
      const set = sets.find((s) => s.id === room.question_set_id);
      if (set) {
        pool = allActive.filter((q) => set.question_ids.includes(q.id));
      }
    } else {
      pool =
        room.categories.length > 0
          ? allActive.filter((q) => room.categories.includes(q.category))
          : allActive;
    }

    if (pool.length === 0) pool = allActive;
    if (pool.length === 0) return null;

    const used = new Set(room.turn_state.used_question_ids);
    const unused = pool.filter((q) => !used.has(q.id));
    const source = unused.length > 0 ? unused : pool;

    // Exact difficulty match first
    const exactDiff = source.filter((q) => q.difficulty === difficulty);
    if (exactDiff.length > 0) {
      return exactDiff[Math.floor(Math.random() * exactDiff.length)];
    }

    // Closest difficulty fallback if custom set lacks that exact difficulty
    const sortedByDiff = [...source].sort(
      (a, b) => Math.abs(a.difficulty - difficulty) - Math.abs(b.difficulty - difficulty)
    );
    const minDist = Math.abs(sortedByDiff[0].difficulty - difficulty);
    const closest = sortedByDiff.filter((q) => Math.abs(q.difficulty - difficulty) === minDist);
    return closest[Math.floor(Math.random() * closest.length)];
  }

  submitAnswer(room_code: string, player_id: string, question_id: string, option_id: string) {
    reloadSqlFromStorage();
    const room = sqlGetRoom(room_code);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.status !== 'QUESTION' || !room.turn_state.active_question) {
      throw new Error('QUESTION_CLOSED: Pertanyaan sudah ditutup.');
    }
    if (room.current_player_id !== player_id) {
      throw new Error('NOT_YOUR_TURN');
    }
    if (room.turn_state.answered_option_id) {
      throw new Error('ALREADY_ANSWERED');
    }
    if (room.turn_state.active_question.question_id !== question_id) {
      throw new Error('INVALID_PAYLOAD');
    }

    const now = Date.now();
    if (now > room.turn_state.active_question.deadline_ms + 350) {
      this.handleQuestionTimeout(room_code, question_id);
      return;
    }

    this.clearTimer(`q_timeout_${room_code}`);
    this.clearTimer(`bot_ans_${room_code}`);

    const allQuestions = sqlGetQuestions();
    const fullQuestion = allQuestions.find((q) => q.id === question_id);
    if (!fullQuestion) throw new Error('INTERNAL');

    const validOption = fullQuestion.options.some((o) => o.id === option_id);
    if (!validOption) throw new Error('INVALID_OPTION');

    const answer_time_ms = Math.max(
      150,
      now - room.turn_state.active_question.started_at_ms
    );
    const time_limit_ms = room.turn_state.active_question.time_limit_sec * 1000;
    const is_correct = option_id === fullQuestion.correct_option_id;

    // PRD 3.5 Scoring Formula
    const time_factor = Math.max(0, Math.min(1, 1 - answer_time_ms / time_limit_ms));
    const difficulty_multiplier = 1 + (fullQuestion.difficulty - 1) * 0.2;
    const points_earned = is_correct ? Math.round(1000 * time_factor * difficulty_multiplier) : 0;

    this.finalizeAnswerAndAdvance(room, fullQuestion, {
      player_id,
      selected_option_id: option_id,
      is_correct,
      is_timeout: false,
      points_earned,
      answer_time_ms,
    });
  }

  private handleQuestionTimeout(room_code: string, question_id: string) {
    reloadSqlFromStorage();
    const room = sqlGetRoom(room_code);
    if (!room || room.status !== 'QUESTION' || !room.turn_state.active_question) return;
    if (room.turn_state.active_question.question_id !== question_id) return;
    if (room.turn_state.answered_option_id) return;

    const allQuestions = sqlGetQuestions();
    const fullQuestion = allQuestions.find((q) => q.id === question_id);
    if (!fullQuestion) return;

    this.finalizeAnswerAndAdvance(room, fullQuestion, {
      player_id: room.current_player_id!,
      selected_option_id: '__TIMEOUT__',
      is_correct: false,
      is_timeout: true,
      points_earned: 0,
      answer_time_ms: room.turn_state.active_question.time_limit_sec * 1000,
    });
  }

  private finalizeAnswerAndAdvance(
    room: Room,
    fullQuestion: Question,
    outcome: {
      player_id: string;
      selected_option_id: string;
      is_correct: boolean;
      is_timeout: boolean;
      points_earned: number;
      answer_time_ms: number;
    }
  ) {
    const players = sqlGetPlayers(room.code);
    const player = players.find((p) => p.id === outcome.player_id);
    if (!player) return;

    const dice = room.turn_state.dice_value || 1;
    const willOvershoot = outcome.is_correct && player.position + dice > 100;
    const movement_allowed = outcome.is_correct && !willOvershoot;

    if (outcome.is_correct) {
      player.score += outcome.points_earned;
      player.correct_answers += 1;
      player.total_answer_time_ms += outcome.answer_time_ms;
      sqlUpdatePlayer(player);
    }

    room.status = 'ANSWER_RESULT';
    room.turn_state.answered_option_id = outcome.selected_option_id;
    room.turn_state.last_answer_result = {
      player_id: player.id,
      question_id: fullQuestion.id,
      is_correct: outcome.is_correct,
      is_timeout: outcome.is_timeout,
      correct_option_id: fullQuestion.correct_option_id,
      explanation: fullQuestion.explanation,
      points_earned: outcome.points_earned,
      total_score: player.score,
      answer_time_ms: outcome.answer_time_ms,
      movement_allowed,
      overshoot_100: willOvershoot,
    };
    sqlSaveRoom(room);

    this.emit('ANSWER_RESULT', {
      room_code: room.code,
      result: room.turn_state.last_answer_result,
    });

    this.emit('LEADERBOARD_UPDATE', {
      room_code: room.code,
      leaderboard: this.computeLeaderboard(room.code),
    });

    // Show answer feedback briefly before moving or ending turn
    const feedbackDelay = outcome.is_correct ? 1450 : 2100;
    this.setTimer(`post_ans_${room.code}`, feedbackDelay, () => {
      reloadSqlFromStorage();
      const r = sqlGetRoom(room.code);
      if (!r || r.status !== 'ANSWER_RESULT') return;

      if (!movement_allowed) {
        this.advanceToNextTurn(r.code);
        return;
      }

      // Move step by step
      const pList = sqlGetPlayers(r.code);
      const p = pList.find((item) => item.id === player.id);
      if (!p) return;

      const fromPos = p.position;
      const toPos = fromPos + dice;
      p.position = toPos;
      sqlUpdatePlayer(p);

      r.status = 'MOVING';
      r.turn_state.last_movement = {
        player_id: p.id,
        from_position: fromPos,
        to_position: toPos,
        steps: dice,
        movement_type: 'NORMAL',
        is_finished: toPos === 100,
      };
      sqlSaveRoom(r);

      this.emit('PLAYER_MOVED', {
        room_code: r.code,
        ...r.turn_state.last_movement,
      });

      const stepAnimMs = Math.max(700, dice * 260 + 250);
      this.setTimer(`post_move_${r.code}`, stepAnimMs, () => {
        this.checkBoardEffectsOrFinish(r.code, p.id);
      });
    });
  }

  private checkBoardEffectsOrFinish(room_code: string, player_id: string) {
    reloadSqlFromStorage();
    const room = sqlGetRoom(room_code);
    if (!room || room.status !== 'MOVING') return;
    const players = sqlGetPlayers(room_code);
    const player = players.find((p) => p.id === player_id);
    if (!player) return;

    if (player.position >= 100) {
      player.position = 100;
      sqlUpdatePlayer(player);
      this.finishGame(room, player);
      return;
    }

    const map: MapTheme = MAP_THEMES.find((m) => m.id === room.map_id) || MAP_THEMES[0];
    const ladder = map.ladders.find((l) => l.from === player.position);
    const snake = map.snakes.find((s) => s.from === player.position);

    if (ladder) {
      const fromPos = player.position;
      player.position = ladder.to;
      sqlUpdatePlayer(player);

      room.status = 'LADDER_ANIMATION';
      room.turn_state.last_movement = {
        player_id: player.id,
        from_position: fromPos,
        to_position: ladder.to,
        steps: ladder.to - fromPos,
        movement_type: 'LADDER',
        edge_id: ladder.id,
        is_finished: ladder.to === 100,
      };
      sqlSaveRoom(room);

      this.emit('LADDER_TRIGGERED', {
        room_code,
        player_id: player.id,
        ladder_id: ladder.id,
        label: ladder.label,
        from_position: fromPos,
        to_position: ladder.to,
      });

      this.emit('LEADERBOARD_UPDATE', {
        room_code,
        leaderboard: this.computeLeaderboard(room_code),
      });

      this.setTimer(`post_ladder_${room_code}`, 1200, () => {
        if (player.position >= 100) {
          const rNow = sqlGetRoom(room_code);
          if (rNow) this.finishGame(rNow, player);
        } else {
          this.advanceToNextTurn(room_code);
        }
      });
      return;
    }

    if (snake) {
      const fromPos = player.position;
      player.position = snake.to;
      sqlUpdatePlayer(player);

      room.status = 'SNAKE_ANIMATION';
      room.turn_state.last_movement = {
        player_id: player.id,
        from_position: fromPos,
        to_position: snake.to,
        steps: fromPos - snake.to,
        movement_type: 'SNAKE',
        edge_id: snake.id,
        is_finished: false,
      };
      sqlSaveRoom(room);

      this.emit('SNAKE_TRIGGERED', {
        room_code,
        player_id: player.id,
        snake_id: snake.id,
        label: snake.label,
        from_position: fromPos,
        to_position: snake.to,
      });

      this.emit('LEADERBOARD_UPDATE', {
        room_code,
        leaderboard: this.computeLeaderboard(room_code),
      });

      this.setTimer(`post_snake_${room_code}`, 1200, () => {
        this.advanceToNextTurn(room_code);
      });
      return;
    }

    this.emit('LEADERBOARD_UPDATE', {
      room_code,
      leaderboard: this.computeLeaderboard(room_code),
    });
    this.advanceToNextTurn(room_code);
  }

  private advanceToNextTurn(room_code: string) {
    reloadSqlFromStorage();
    const room = sqlGetRoom(room_code);
    if (!room || room.status === 'GAME_OVER') return;
    const players = sqlGetPlayers(room_code);
    if (players.length === 0) return;

    const currentIdx = players.findIndex((p) => p.id === room.current_player_id);
    const nextIdx = (currentIdx + 1) % players.length;
    const nextPlayer = players[nextIdx];

    room.status = 'TURN_END';
    sqlSaveRoom(room);

    this.setTimer(`turn_change_${room_code}`, 450, () => {
      reloadSqlFromStorage();
      const r = sqlGetRoom(room_code);
      if (!r || r.status === 'GAME_OVER') return;

      r.status = 'TURN_START';
      r.current_turn += 1;
      r.current_player_id = nextPlayer.id;
      r.turn_state = {
        ...r.turn_state,
        turn_number: r.current_turn,
        current_player_id: nextPlayer.id,
        dice_value: null,
        animation_seed: null,
        active_question: null,
        answered_option_id: null,
        last_answer_result: null,
        last_movement: null,
        turn_started_at_ms: Date.now(),
      };
      sqlSaveRoom(r);

      this.emit('TURN_CHANGED', {
        room_code,
        turn_number: r.current_turn,
        previous_player_id: currentIdx >= 0 ? players[currentIdx].id : null,
        current_player_id: nextPlayer.id,
        current_player_nickname: nextPlayer.nickname,
      });

      this.emit('TURN_STARTED', {
        room_code,
        turn_number: r.current_turn,
        current_player_id: nextPlayer.id,
        current_player_nickname: nextPlayer.nickname,
        position: nextPlayer.position,
        turn_started_at: Date.now(),
      });

      this.maybeTriggerBotTurn(room_code);
    });
  }

  endGameEarly(room_code: string, host_token: string) {
    reloadSqlFromStorage();
    const room = sqlGetRoom(room_code);
    if (!room) throw new Error('Room tidak ditemukan.');
    if (room.host_token !== host_token) throw new Error('Hanya host yang dapat mengakhiri permainan.');
    this.clearAllRoomTimers(room_code);
    const leaderboard = this.computeLeaderboard(room_code);
    const players = sqlGetPlayers(room_code);
    const winnerPlayer =
      players.find((p) => p.id === leaderboard[0]?.player_id) || players[0];
    if (winnerPlayer) {
      this.finishGame(room, winnerPlayer);
    }
  }

  private clearAllRoomTimers(room_code: string) {
    for (const key of Array.from(this.activeTimers.keys())) {
      if (key.endsWith(`_${room_code}`)) {
        this.clearTimer(key);
      }
    }
  }

  private finishGame(room: Room, winnerPlayer: Player) {
    this.clearAllRoomTimers(room.code);
    room.status = 'GAME_OVER';
    sqlSaveRoom(room);

    const leaderboard = this.computeLeaderboard(room.code, winnerPlayer.id);
    const winnerEntry = leaderboard.find((l) => l.player_id === winnerPlayer.id) || leaderboard[0];

    const result: GameResult = {
      room_code: room.code,
      room_name: room.name,
      map_id: room.map_id,
      winner: winnerEntry,
      leaderboard,
      total_turns: room.current_turn,
      ended_at: new Date().toISOString(),
    };
    sqlSaveGameResult(result);

    this.emit('GAME_OVER', {
      room_code: room.code,
      result,
    });
  }

  computeLeaderboard(room_code: string, explicitWinnerId?: string): LeaderboardEntry[] {
    const players = sqlGetPlayers(room_code);
    // Sort: reached 100 winner first (if finished), then score DESC, correct_answers DESC, total_answer_time_ms ASC (PRD 3.5)
    const sorted = [...players].sort((a, b) => {
      if (explicitWinnerId) {
        if (a.id === explicitWinnerId) return -1;
        if (b.id === explicitWinnerId) return 1;
      }
      if (b.score !== a.score) return b.score - a.score;
      if (b.correct_answers !== a.correct_answers) return b.correct_answers - a.correct_answers;
      return a.total_answer_time_ms - b.total_answer_time_ms;
    });

    return sorted.map((p, idx) => ({
      rank: idx + 1,
      player_id: p.id,
      nickname: p.nickname,
      character_id: p.character_id,
      position: p.position,
      score: p.score,
      correct_answers: p.correct_answers,
      total_answer_time_ms: p.total_answer_time_ms,
      is_bot: p.is_bot,
    }));
  }

  getGameResult(room_code: string): GameResult | null {
    return sqlGetGameResult(room_code);
  }

  reconcileRoomIfNeeded(room_code: string) {
    reloadSqlFromStorage();
    const room = sqlGetRoom(room_code);
    if (!room) return;
    if (
      room.status === 'QUESTION' &&
      room.turn_state.active_question &&
      !room.turn_state.answered_option_id &&
      Date.now() > room.turn_state.active_question.deadline_ms + 800
    ) {
      this.handleQuestionTimeout(room_code, room.turn_state.active_question.question_id);
    }
  }
}

export const gameServer = new AuthoritativeGameServer();

export function createLog(type: GameLogItem['type'], message: string): GameLogItem {
  return {
    id: `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    type,
    message,
  };
}
