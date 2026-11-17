export type GameStatus =
  | 'LOBBY'
  | 'STARTING'
  | 'TURN_START'
  | 'DICE_ROLLING'
  | 'QUESTION'
  | 'ANSWER_RESULT'
  | 'MOVING'
  | 'SNAKE_ANIMATION'
  | 'LADDER_ANIMATION'
  | 'TURN_END'
  | 'GAME_OVER';

export type QuestionMode = 'CUSTOM' | 'RANDOM';

export type QuestionCategory =
  | 'PUSRI'
  | 'PERTANIAN'
  | 'INDUSTRI'
  | 'LABORATORIUM'
  | 'DISTRIBUSI'
  | 'K3'
  | 'LINGKUNGAN';

export interface SnakeEdge {
  id: string;
  from: number;
  to: number;
  label?: string;
}

export interface LadderEdge {
  id: string;
  from: number;
  to: number;
  label?: string;
}

export interface MapTheme {
  id: string;
  name: string;
  titleId: string;
  subtitle: string;
  description: string;
  image_url: string;
  accent_color: string;
  badge_bg: string;
  features: string[];
  snakes: SnakeEdge[];
  ladders: LadderEdge[];
  is_active: boolean;
}

export interface CharacterAsset {
  id: string;
  name: string;
  role: string;
  group: 'Karyawan' | 'Petani' | 'Sekuriti';
  tagline: string;
  image_url: string;
  avatar_url: string;
  sheet_url: string;
  accent_color: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  is_correct?: boolean;
}

export interface Question {
  id: string;
  question_text: string;
  category: QuestionCategory;
  difficulty: 1 | 2 | 3 | 4 | 5 | 6;
  time_limit_sec: number;
  options: QuestionOption[];
  correct_option_id: string;
  explanation: string;
  is_active: boolean;
  created_at: string;
}

export interface QuestionPublic {
  question_id: string;
  question_text: string;
  category: QuestionCategory;
  difficulty: 1 | 2 | 3 | 4 | 5 | 6;
  time_limit_sec: number;
  started_at_ms: number;
  deadline_ms: number;
  options: Array<{ id: string; text: string }>;
}

export interface QuestionSet {
  id: string;
  name: string;
  description: string;
  question_ids: string[];
  created_at: string;
}

export interface Player {
  id: string;
  room_code: string;
  player_token: string;
  nickname: string;
  character_id: string;
  position: number;
  score: number;
  correct_answers: number;
  total_answer_time_ms: number;
  is_ready: boolean;
  is_connected: boolean;
  is_bot: boolean;
  joined_at: string;
}

export interface ActiveTurnState {
  turn_number: number;
  current_player_id: string;
  dice_value: number | null;
  animation_seed: number | null;
  active_question: QuestionPublic | null;
  answered_option_id: string | null;
  last_answer_result: {
    player_id: string;
    question_id: string;
    is_correct: boolean;
    is_timeout: boolean;
    correct_option_id: string;
    explanation: string;
    points_earned: number;
    total_score: number;
    answer_time_ms: number;
    movement_allowed: boolean;
    overshoot_100: boolean;
  } | null;
  last_movement: {
    player_id: string;
    from_position: number;
    to_position: number;
    steps: number;
    movement_type: 'NORMAL' | 'SNAKE' | 'LADDER';
    edge_id?: string;
    is_finished: boolean;
  } | null;
  used_question_ids: string[];
  turn_started_at_ms: number;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  host_token: string;
  map_id: string;
  status: GameStatus;
  max_players: number;
  question_mode: QuestionMode;
  question_set_id: string | null;
  categories: QuestionCategory[];
  turn_time_limit_sec: number;
  current_turn: number;
  current_player_id: string | null;
  turn_state: ActiveTurnState;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  player_id: string;
  nickname: string;
  character_id: string;
  position: number;
  score: number;
  correct_answers: number;
  total_answer_time_ms: number;
  is_bot: boolean;
}

export interface GameResult {
  room_code: string;
  room_name: string;
  map_id: string;
  winner: LeaderboardEntry;
  leaderboard: LeaderboardEntry[];
  total_turns: number;
  ended_at: string;
}

export interface GameLogItem {
  id: string;
  timestamp: number;
  type: 'info' | 'dice' | 'correct' | 'wrong' | 'snake' | 'ladder' | 'win';
  message: string;
}

export interface SessionAuth {
  role: 'host' | 'player';
  room_code: string;
  token: string;
  player_id?: string;
  nickname?: string;
}

export interface WSEventEnvelope<T = unknown> {
  event: string;
  payload: T;
  event_id: string;
  timestamp: number;
}
