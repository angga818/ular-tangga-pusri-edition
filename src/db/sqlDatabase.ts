import alasql from 'alasql';
import { CHARACTERS, MAP_THEMES } from '../data/mapsAndChars';
import { SEED_QUESTIONS, SEED_QUESTION_SETS } from '../data/seedQuestions';
import {
  ActiveTurnState,
  GameResult,
  GameStatus,
  MapTheme,
  Player,
  Question,
  QuestionCategory,
  QuestionMode,
  QuestionSet,
  Room,
} from '../types/game';

const STORAGE_KEY = 'pusri_ulartangga_sql_store_v1';

interface PersistedSnapshot {
  questions: Array<Record<string, unknown>>;
  question_sets: Array<Record<string, unknown>>;
  rooms: Array<Record<string, unknown>>;
  players: Array<Record<string, unknown>>;
  game_results: Array<Record<string, unknown>>;
}

let initialized = false;

function persistToStorage() {
  try {
    const snapshot: PersistedSnapshot = {
      questions: alasql('SELECT * FROM questions') as Array<Record<string, unknown>>,
      question_sets: alasql('SELECT * FROM question_sets') as Array<Record<string, unknown>>,
      rooms: alasql('SELECT * FROM rooms') as Array<Record<string, unknown>>,
      players: alasql('SELECT * FROM players') as Array<Record<string, unknown>>,
      game_results: alasql('SELECT * FROM game_results') as Array<Record<string, unknown>>,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('SQL persistence error:', err);
  }
}

export function reloadSqlFromStorage() {
  if (!initialized) {
    initSqlDatabase();
    return;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const snap = JSON.parse(raw) as PersistedSnapshot;
    alasql('DELETE FROM questions');
    alasql('DELETE FROM question_sets');
    alasql('DELETE FROM rooms');
    alasql('DELETE FROM players');
    alasql('DELETE FROM game_results');

    for (const row of snap.questions || []) alasql('INSERT INTO questions VALUES ?', [row]);
    for (const row of snap.question_sets || []) alasql('INSERT INTO question_sets VALUES ?', [row]);
    for (const row of snap.rooms || []) alasql('INSERT INTO rooms VALUES ?', [row]);
    for (const row of snap.players || []) alasql('INSERT INTO players VALUES ?', [row]);
    for (const row of snap.game_results || []) alasql('INSERT INTO game_results VALUES ?', [row]);
  } catch (err) {
    console.warn('Failed to reload SQL snapshot:', err);
  }
}

export function initSqlDatabase() {
  if (initialized) return;

  alasql(`
    CREATE TABLE IF NOT EXISTS maps (
      id STRING PRIMARY KEY,
      name STRING,
      title_id STRING,
      subtitle STRING,
      description STRING,
      image_url STRING,
      accent_color STRING,
      snakes_json STRING,
      ladders_json STRING,
      is_active BOOLEAN
    );
  `);

  alasql(`
    CREATE TABLE IF NOT EXISTS characters (
      id STRING PRIMARY KEY,
      name STRING,
      role STRING,
      char_group STRING,
      tagline STRING,
      image_url STRING,
      avatar_url STRING,
      accent_color STRING
    );
  `);

  alasql(`
    CREATE TABLE IF NOT EXISTS questions (
      id STRING PRIMARY KEY,
      question_text STRING,
      category STRING,
      difficulty INT,
      time_limit_sec INT,
      options_json STRING,
      correct_option_id STRING,
      explanation STRING,
      is_active BOOLEAN,
      created_at STRING
    );
  `);

  alasql(`
    CREATE TABLE IF NOT EXISTS question_sets (
      id STRING PRIMARY KEY,
      name STRING,
      description STRING,
      question_ids_json STRING,
      created_at STRING
    );
  `);

  alasql(`
    CREATE TABLE IF NOT EXISTS rooms (
      id STRING PRIMARY KEY,
      code STRING,
      name STRING,
      host_token STRING,
      map_id STRING,
      status STRING,
      max_players INT,
      question_mode STRING,
      question_set_id STRING,
      categories_json STRING,
      turn_time_limit_sec INT,
      current_turn INT,
      current_player_id STRING,
      turn_state_json STRING,
      spectator_ids_json STRING,
      created_at STRING
    );
  `);

  alasql(`
    CREATE TABLE IF NOT EXISTS players (
      id STRING PRIMARY KEY,
      room_code STRING,
      player_token STRING,
      nickname STRING,
      character_id STRING,
      position INT,
      score INT,
      correct_answers INT,
      total_answer_time_ms INT,
      is_ready BOOLEAN,
      is_connected BOOLEAN,
      is_bot BOOLEAN,
      is_spectator BOOLEAN,
      joined_at STRING
    );
  `);

  alasql(`
    CREATE TABLE IF NOT EXISTS game_results (
      room_code STRING PRIMARY KEY,
      room_name STRING,
      map_id STRING,
      winner_json STRING,
      leaderboard_json STRING,
      total_turns INT,
      ended_at STRING
    );
  `);

  // Seed static reference tables (maps & characters)
  alasql('DELETE FROM maps');
  for (const m of MAP_THEMES) {
    alasql('INSERT INTO maps VALUES ?', [
      {
        id: m.id,
        name: m.name,
        title_id: m.titleId,
        subtitle: m.subtitle,
        description: m.description,
        image_url: m.image_url,
        accent_color: m.accent_color,
        snakes_json: JSON.stringify(m.snakes),
        ladders_json: JSON.stringify(m.ladders),
        is_active: m.is_active,
      },
    ]);
  }

  alasql('DELETE FROM characters');
  for (const c of CHARACTERS) {
    alasql('INSERT INTO characters VALUES ?', [
      {
        id: c.id,
        name: c.name,
        role: c.role,
        char_group: c.group,
        tagline: c.tagline,
        image_url: c.image_url,
        avatar_url: c.avatar_url,
        accent_color: c.accent_color,
      },
    ]);
  }

  // Restore persisted mutable tables or seed defaults
  let restored = false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const snap = JSON.parse(raw) as PersistedSnapshot;
      if (Array.isArray(snap.questions) && snap.questions.length > 0) {
        for (const row of snap.questions) alasql('INSERT INTO questions VALUES ?', [row]);
        for (const row of snap.question_sets || []) alasql('INSERT INTO question_sets VALUES ?', [row]);
        for (const row of snap.rooms || []) alasql('INSERT INTO rooms VALUES ?', [row]);
        for (const row of snap.players || []) alasql('INSERT INTO players VALUES ?', [row]);
        for (const row of snap.game_results || []) alasql('INSERT INTO game_results VALUES ?', [row]);
        restored = true;
      }
    }
  } catch {
    restored = false;
  }

  if (!restored) {
    for (const q of SEED_QUESTIONS) {
      alasql('INSERT INTO questions VALUES ?', [
        {
          id: q.id,
          question_text: q.question_text,
          category: q.category,
          difficulty: q.difficulty,
          time_limit_sec: q.time_limit_sec,
          options_json: JSON.stringify(q.options),
          correct_option_id: q.correct_option_id,
          explanation: q.explanation,
          is_active: q.is_active,
          created_at: q.created_at,
        },
      ]);
    }
    for (const s of SEED_QUESTION_SETS) {
      alasql('INSERT INTO question_sets VALUES ?', [
        {
          id: s.id,
          name: s.name,
          description: s.description,
          question_ids_json: JSON.stringify(s.question_ids),
          created_at: s.created_at,
        },
      ]);
    }
    persistToStorage();
  }

  initialized = true;
}

// === Query Helpers ===

export function sqlGetMaps(): MapTheme[] {
  initSqlDatabase();
  const rows = alasql('SELECT * FROM maps WHERE is_active = true') as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const base = MAP_THEMES.find((m) => m.id === r.id);
    return {
      id: String(r.id),
      name: String(r.name),
      titleId: String(r.title_id),
      subtitle: String(r.subtitle),
      description: String(r.description),
      image_url: String(r.image_url),
      accent_color: String(r.accent_color),
      badge_bg: base?.badge_bg || 'bg-amber-500',
      features: base?.features || [],
      snakes: JSON.parse(String(r.snakes_json)),
      ladders: JSON.parse(String(r.ladders_json)),
      is_active: Boolean(r.is_active),
    };
  });
}

function mapRowToQuestion(r: Record<string, unknown>): Question {
  return {
    id: String(r.id),
    question_text: String(r.question_text),
    category: String(r.category) as QuestionCategory,
    difficulty: Number(r.difficulty) as Question['difficulty'],
    time_limit_sec: Number(r.time_limit_sec),
    options: JSON.parse(String(r.options_json)),
    correct_option_id: String(r.correct_option_id),
    explanation: String(r.explanation || ''),
    is_active: Boolean(r.is_active),
    created_at: String(r.created_at),
  };
}

export function sqlGetQuestions(filters?: {
  difficulty?: number;
  category?: string;
  search?: string;
  activeOnly?: boolean;
}): Question[] {
  initSqlDatabase();
  let rows = alasql('SELECT * FROM questions ORDER BY difficulty ASC, id ASC') as Array<Record<string, unknown>>;
  if (filters?.activeOnly) {
    rows = rows.filter((r) => Boolean(r.is_active));
  }
  if (filters?.difficulty) {
    rows = rows.filter((r) => Number(r.difficulty) === filters.difficulty);
  }
  if (filters?.category && filters.category !== 'ALL') {
    rows = rows.filter((r) => String(r.category) === filters.category);
  }
  if (filters?.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        String(r.question_text).toLowerCase().includes(term) ||
        String(r.explanation || '').toLowerCase().includes(term)
    );
  }
  return rows.map(mapRowToQuestion);
}

export function sqlCreateQuestion(input: Omit<Question, 'id' | 'created_at'>): Question {
  initSqlDatabase();
  if (!input.question_text.trim()) throw new Error('Pertanyaan wajib diisi.');
  if (input.difficulty < 1 || input.difficulty > 6) throw new Error('Tingkat kesulitan harus 1–6.');
  if (input.time_limit_sec < 5 || input.time_limit_sec > 60) throw new Error('Batas waktu harus 5–60 detik.');
  if (input.options.length < 2 || input.options.length > 4) throw new Error('Jumlah opsi harus 2–4.');
  const correctCount = input.options.filter((o) => o.id === input.correct_option_id || o.is_correct).length;
  if (correctCount !== 1) throw new Error('Harus ada tepat satu jawaban benar.');

  const id = `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const created_at = new Date().toISOString();
  const cleanOptions = input.options.map((o) => ({ id: o.id, text: o.text.trim() }));

  alasql('INSERT INTO questions VALUES ?', [
    {
      id,
      question_text: input.question_text.trim(),
      category: input.category,
      difficulty: input.difficulty,
      time_limit_sec: input.time_limit_sec,
      options_json: JSON.stringify(cleanOptions),
      correct_option_id: input.correct_option_id,
      explanation: input.explanation.trim(),
      is_active: input.is_active ?? true,
      created_at,
    },
  ]);
  persistToStorage();
  return { ...input, id, options: cleanOptions, created_at };
}

export function sqlUpdateQuestion(id: string, input: Partial<Question>): Question {
  initSqlDatabase();
  const existing = alasql('SELECT * FROM questions WHERE id = ?', [id]) as Array<Record<string, unknown>>;
  if (!existing.length) throw new Error('Pertanyaan tidak ditemukan.');
  const current = mapRowToQuestion(existing[0]);
  const updated: Question = {
    ...current,
    ...input,
    id: current.id,
  };
  alasql(
    'UPDATE questions SET question_text = ?, category = ?, difficulty = ?, time_limit_sec = ?, options_json = ?, correct_option_id = ?, explanation = ?, is_active = ? WHERE id = ?',
    [
      updated.question_text,
      updated.category,
      updated.difficulty,
      updated.time_limit_sec,
      JSON.stringify(updated.options.map((o) => ({ id: o.id, text: o.text }))),
      updated.correct_option_id,
      updated.explanation,
      updated.is_active,
      id,
    ]
  );
  persistToStorage();
  return updated;
}

export function sqlDeleteQuestion(id: string) {
  initSqlDatabase();
  alasql('DELETE FROM questions WHERE id = ?', [id]);
  persistToStorage();
}

export function sqlGetQuestionSets(): QuestionSet[] {
  initSqlDatabase();
  const rows = alasql('SELECT * FROM question_sets ORDER BY created_at DESC') as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    description: String(r.description || ''),
    question_ids: JSON.parse(String(r.question_ids_json || '[]')),
    created_at: String(r.created_at),
  }));
}

export function sqlCreateQuestionSet(name: string, description: string, question_ids: string[]): QuestionSet {
  initSqlDatabase();
  if (!name.trim()) throw new Error('Nama kumpulan pertanyaan wajib diisi.');
  if (question_ids.length < 1) throw new Error('Pilih minimal 1 pertanyaan untuk paket soal.');
  const id = `set_${Date.now().toString(36)}`;
  const created_at = new Date().toISOString();
  alasql('INSERT INTO question_sets VALUES ?', [
    {
      id,
      name: name.trim(),
      description: description.trim(),
      question_ids_json: JSON.stringify(question_ids),
      created_at,
    },
  ]);
  persistToStorage();
  return { id, name: name.trim(), description: description.trim(), question_ids, created_at };
}

function mapRowToRoom(r: Record<string, unknown>): Room {
  return {
    id: String(r.id),
    code: String(r.code),
    name: String(r.name),
    host_token: String(r.host_token),
    map_id: String(r.map_id),
    status: String(r.status) as GameStatus,
    max_players: Number(r.max_players),
    question_mode: String(r.question_mode) as QuestionMode,
    question_set_id: r.question_set_id ? String(r.question_set_id) : null,
    categories: JSON.parse(String(r.categories_json || '[]')),
    turn_time_limit_sec: Number(r.turn_time_limit_sec),
    current_turn: Number(r.current_turn),
    current_player_id: r.current_player_id ? String(r.current_player_id) : null,
    turn_state: JSON.parse(String(r.turn_state_json)) as ActiveTurnState,
    spectator_ids: JSON.parse(String(r.spectator_ids_json || '[]')),
    created_at: String(r.created_at),
  };
}

function mapRowToPlayer(r: Record<string, unknown>): Player {
  return {
    id: String(r.id),
    room_code: String(r.room_code),
    player_token: String(r.player_token),
    nickname: String(r.nickname),
    character_id: String(r.character_id),
    position: Number(r.position),
    score: Number(r.score),
    correct_answers: Number(r.correct_answers),
    total_answer_time_ms: Number(r.total_answer_time_ms),
    is_ready: Boolean(r.is_ready),
    is_connected: Boolean(r.is_connected),
    is_bot: Boolean(r.is_bot),
    is_spectator: Boolean(r.is_spectator),
    joined_at: String(r.joined_at),
  };
}

export function sqlCreateRoom(params: {
  room_name: string;
  map_id: string;
  max_players: number;
  question_mode: QuestionMode;
  question_set_id: string | null;
  categories: QuestionCategory[];
  turn_time_limit_sec: number;
}): Room {
  initSqlDatabase();
  // Generate unique 6-digit PIN
  let code = '';
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = String(Math.floor(100000 + Math.random() * 900000));
    const exists = alasql('SELECT code FROM rooms WHERE code = ?', [candidate]) as unknown[];
    if (exists.length === 0) {
      code = candidate;
      break;
    }
  }
  if (!code) code = String(Date.now()).slice(-6);

  const id = `room_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const host_token = `host_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  const created_at = new Date().toISOString();
  const initialTurnState: ActiveTurnState = {
    turn_number: 0,
    current_player_id: '',
    dice_value: null,
    animation_seed: null,
    active_question: null,
    answered_option_id: null,
    last_answer_result: null,
    last_movement: null,
    used_question_ids: [],
    turn_started_at_ms: 0,
  };

  alasql('INSERT INTO rooms VALUES ?', [
    {
      id,
      code,
      name: params.room_name.trim(),
      host_token,
      map_id: params.map_id,
      status: 'LOBBY',
      max_players: params.max_players,
      question_mode: params.question_mode,
      question_set_id: params.question_set_id || '',
      categories_json: JSON.stringify(params.categories),
      turn_time_limit_sec: params.turn_time_limit_sec,
      current_turn: 0,
      current_player_id: '',
      turn_state_json: JSON.stringify(initialTurnState),
      spectator_ids_json: '[]',
      created_at,
    },
  ]);
  persistToStorage();

  return {
    id,
    code,
    name: params.room_name.trim(),
    host_token,
    map_id: params.map_id,
    status: 'LOBBY',
    max_players: params.max_players,
    question_mode: params.question_mode,
    question_set_id: params.question_set_id,
    categories: params.categories,
    turn_time_limit_sec: params.turn_time_limit_sec,
    current_turn: 0,
    current_player_id: null,
    turn_state: initialTurnState,
    spectator_ids: [],
    created_at,
  };
}

export function sqlGetRoom(code: string): Room | null {
  initSqlDatabase();
  const rows = alasql('SELECT * FROM rooms WHERE code = ?', [code]) as Array<Record<string, unknown>>;
  if (!rows.length) return null;
  return mapRowToRoom(rows[0]);
}

export function sqlSaveRoom(room: Room) {
  initSqlDatabase();
  alasql(
    'UPDATE rooms SET status = ?, map_id = ?, current_turn = ?, current_player_id = ?, turn_state_json = ? WHERE code = ?',
    [
      room.status,
      room.map_id,
      room.current_turn,
      room.current_player_id || '',
      JSON.stringify(room.turn_state),
      room.code,
    ]
  );
  persistToStorage();
}

export function sqlGetPlayers(room_code: string): Player[] {
  initSqlDatabase();
  const rows = alasql('SELECT * FROM players WHERE room_code = ? ORDER BY joined_at ASC', [
    room_code,
  ]) as Array<Record<string, unknown>>;
  return rows.map(mapRowToPlayer);
}

export function sqlAddPlayer(params: {
  room_code: string;
  nickname: string;
  character_id: string;
  is_bot?: boolean;
  is_ready?: boolean;
  is_spectator?: boolean;
}): Player {
  initSqlDatabase();
  const id = `player_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const player_token = `ptok_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const joined_at = new Date().toISOString();

  const player: Player = {
    id,
    room_code: params.room_code,
    player_token,
    nickname: params.nickname.trim(),
    character_id: params.character_id,
    position: 1,
    score: 0,
    correct_answers: 0,
    total_answer_time_ms: 0,
    is_ready: params.is_ready ?? false,
    is_connected: true,
    is_bot: params.is_bot ?? false,
    is_spectator: params.is_spectator ?? false,
    joined_at,
  };

  alasql('INSERT INTO players VALUES ?', [
    {
      id: player.id,
      room_code: player.room_code,
      player_token: player.player_token,
      nickname: player.nickname,
      character_id: player.character_id,
      position: player.position,
      score: player.score,
      correct_answers: player.correct_answers,
      total_answer_time_ms: player.total_answer_time_ms,
      is_ready: player.is_ready,
      is_connected: player.is_connected,
      is_bot: player.is_bot,
      is_spectator: player.is_spectator,
      joined_at: player.joined_at,
    },
  ]);
  persistToStorage();
  return player;
}

export function sqlUpdatePlayer(player: Player) {
  initSqlDatabase();
  alasql(
    'UPDATE players SET position = ?, score = ?, correct_answers = ?, total_answer_time_ms = ?, is_ready = ?, is_connected = ?, is_spectator = ? WHERE id = ?',
    [
      player.position,
      player.score,
      player.correct_answers,
      player.total_answer_time_ms,
      player.is_ready,
      player.is_connected,
      player.is_spectator,
      player.id,
    ]
  );
  persistToStorage();
}

export function sqlRemovePlayer(playerId: string) {
  initSqlDatabase();
  alasql('DELETE FROM players WHERE id = ?', [playerId]);
  persistToStorage();
}

export function sqlSaveGameResult(result: GameResult) {
  initSqlDatabase();
  alasql('DELETE FROM game_results WHERE room_code = ?', [result.room_code]);
  alasql('INSERT INTO game_results VALUES ?', [
    {
      room_code: result.room_code,
      room_name: result.room_name,
      map_id: result.map_id,
      winner_json: JSON.stringify(result.winner),
      leaderboard_json: JSON.stringify(result.leaderboard),
      total_turns: result.total_turns,
      ended_at: result.ended_at,
    },
  ]);
  persistToStorage();
}

export function sqlGetGameResult(room_code: string): GameResult | null {
  initSqlDatabase();
  const rows = alasql('SELECT * FROM game_results WHERE room_code = ?', [room_code]) as Array<
    Record<string, unknown>
  >;
  if (!rows.length) return null;
  const r = rows[0];
  return {
    room_code: String(r.room_code),
    room_name: String(r.room_name),
    map_id: String(r.map_id),
    winner: JSON.parse(String(r.winner_json)),
    leaderboard: JSON.parse(String(r.leaderboard_json)),
    total_turns: Number(r.total_turns),
    ended_at: String(r.ended_at),
  };
}

export function sqlGetRecentRooms(): Array<{
  code: string;
  name: string;
  status: string;
  map_id: string;
  player_count: number;
  max_players: number;
}> {
  initSqlDatabase();
  const rooms = alasql('SELECT * FROM rooms ORDER BY created_at DESC LIMIT 8') as Array<Record<string, unknown>>;
  return rooms.map((r) => {
    const pCount = (alasql('SELECT id FROM players WHERE room_code = ?', [r.code]) as unknown[]).length;
    return {
      code: String(r.code),
      name: String(r.name),
      status: String(r.status),
      map_id: String(r.map_id),
      player_count: pCount,
      max_players: Number(r.max_players),
    };
  });
}

export function sqlRunReadQuery(query: string): unknown {
  initSqlDatabase();
  const trimmed = query.trim();
  if (!/^select\s+/i.test(trimmed)) {
    throw new Error('Hanya query SELECT yang diizinkan di SQL Inspector.');
  }
  return alasql(trimmed);
}
