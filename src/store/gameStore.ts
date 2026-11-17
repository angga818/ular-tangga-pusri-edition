import { create } from 'zustand';
import { CHARACTERS, getTilePercentPosition, MAP_THEMES } from '../data/mapsAndChars';
import {
  reloadSqlFromStorage,
  sqlGetGameResult,
  sqlGetPlayers,
  sqlGetRoom,
} from '../db/sqlDatabase';
import { gameServer } from '../engine/gameServer';
import {
  GameLogItem,
  GameResult,
  LeaderboardEntry,
  Player,
  QuestionSet,
  Room,
  SessionAuth,
  WSEventEnvelope,
} from '../types/game';

export type Screen =
  | 'menu'
  | 'create_room'
  | 'join_room'
  | 'lobby'
  | 'game'
  | 'result'
  | 'question_bank'
  | 'how_to_play';

interface GameStoreState {
  screen: Screen;
  auth: SessionAuth | null;
  room: Room | null;
  players: Player[];
  leaderboard: LeaderboardEntry[];
  gameResult: GameResult | null;
  logs: GameLogItem[];
  connectionStatus: 'offline' | 'connecting' | 'online' | 'reconnecting';
  lastEvent: WSEventEnvelope<unknown> | null;
  toast: { id: number; message: string; tone: 'success' | 'error' | 'info' } | null;
  activeQuestionSet: QuestionSet | null;
  lastDiceValue: number | null;
  movementTarget: {
    player_id: string;
    from_position: number;
    to_position: number;
    movement_type: 'NORMAL' | 'SNAKE' | 'LADDER';
    edge_id?: string;
    key: number;
  } | null;
  confettiTrigger: number;
  lastWinnerId: string | null;

  setScreen: (screen: Screen) => void;
  pushToast: (message: string, tone?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
  setAuth: (auth: SessionAuth | null) => void;
  refreshRoom: () => void;
  handleWSEvent: (env: WSEventEnvelope<unknown>) => void;
  resetSession: () => void;
  syncResult: () => void;
}

function toastSeq() {
  return Date.now() + Math.random();
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  screen: 'menu',
  auth: null,
  room: null,
  players: [],
  leaderboard: [],
  gameResult: null,
  logs: [],
  connectionStatus: 'online',
  lastEvent: null,
  toast: null,
  activeQuestionSet: null,
  lastDiceValue: null,
  movementTarget: null,
  confettiTrigger: 0,
  lastWinnerId: null,

  setScreen: (screen) => set({ screen }),

  pushToast: (message, tone = 'info') => {
    set({ toast: { id: toastSeq(), message, tone } });
  },

  clearToast: () => set({ toast: null }),

  setAuth: (auth) => set({ auth }),

  refreshRoom: () => {
    const auth = get().auth;
    if (!auth) return;
    reloadSqlFromStorage();
    const room = sqlGetRoom(auth.room_code);
    const players = sqlGetPlayers(auth.room_code);
    const leaderboard = gameServer.computeLeaderboard(auth.room_code);
    set({ room, players, leaderboard });
  },

  syncResult: () => {
    const auth = get().auth;
    if (!auth) return;
    const gameResult = sqlGetGameResult(auth.room_code);
    if (gameResult) set({ gameResult });
  },

  handleWSEvent: (env) => {
    const state = get();
    const auth = state.auth;
    if (!auth) return;

    reloadSqlFromStorage();
    const room = sqlGetRoom(auth.room_code);
    const players = sqlGetPlayers(auth.room_code);
    const leaderboard = gameServer.computeLeaderboard(auth.room_code);
    const payload = (env.payload || {}) as Record<string, unknown>;

    const patch: Partial<GameStoreState> = {
      lastEvent: env,
      room: room || state.room,
      players,
      leaderboard,
      connectionStatus: 'online',
    };

    let log: GameLogItem | null = null;
    const findName = (id: unknown) =>
      players.find((p) => p.id === id)?.nickname || String(id || 'Pemain');

    switch (env.event) {
      case 'ROOM_STATE':
        break;
      case 'PLAYER_JOINED':
        log = {
          id: env.event_id,
          timestamp: env.timestamp,
          type: 'info',
          message: `${findName((payload.player as Player | undefined)?.id)} bergabung ke room.`,
        };
        break;
      case 'PLAYER_LEFT':
        log = {
          id: env.event_id,
          timestamp: env.timestamp,
          type: 'info',
          message: `${findName(payload.player_id)} keluar dari room.`,
        };
        break;
      case 'PLAYER_READY_UPDATE':
        log = {
          id: env.event_id,
          timestamp: env.timestamp,
          type: 'info',
          message: `${findName(payload.player_id)} ${payload.ready ? 'siap bermain' : 'membatalkan status siap'}.`,
        };
        break;
      case 'GAME_STARTED':
        log = { id: env.event_id, timestamp: env.timestamp, type: 'info', message: 'Permainan dimulai! Semua pemain siap.' };
        patch.screen = 'game';
        patch.gameResult = null;
        patch.logs = [];
        break;
      case 'TURN_STARTED':
        patch.lastDiceValue = null;
        log = {
          id: env.event_id,
          timestamp: env.timestamp,
          type: 'info',
          message: `Giliran ${payload.turn_number}: ${findName(payload.current_player_id)} mendapat giliran.`,
        };
        break;
      case 'DICE_RESULT': {
        const diceVal = Number(payload.dice_value || 0);
        patch.lastDiceValue = diceVal;
        log = {
          id: env.event_id,
          timestamp: env.timestamp,
          type: 'dice',
          message: `${findName(payload.player_id)} melempar dadu → ${diceVal}. Pertanyaan tingkat ${diceVal} muncul.`,
        };
        break;
      }
      case 'QUESTION_STARTED':
        break;
      case 'ANSWER_RESULT': {
        const res = payload.result as Room['turn_state']['last_answer_result'];
        if (res) {
          log = {
            id: env.event_id,
            timestamp: env.timestamp,
            type: res.is_correct ? 'correct' : 'wrong',
            message: res.is_correct
              ? `${findName(res.player_id)} menjawab benar (+${res.points_earned} poin)!`
              : res.is_timeout
              ? `${findName(res.player_id)} kehabisan waktu menjawab.`
              : `${findName(res.player_id)} menjawab salah.`,
          };
        }
        break;
      }
      case 'PLAYER_MOVED': {
        const from = Number(payload.from_position || 0);
        const to = Number(payload.to_position || 0);
        const moveType = String(payload.movement_type || 'NORMAL') as 'NORMAL' | 'SNAKE' | 'LADDER';
        patch.movementTarget = {
          player_id: String(payload.player_id || ''),
          from_position: from,
          to_position: to,
          movement_type: moveType,
          edge_id: payload.edge_id ? String(payload.edge_id) : undefined,
          key: env.timestamp + Math.random(),
        };
        log = {
          id: env.event_id,
          timestamp: env.timestamp,
          type: moveType === 'LADDER' ? 'ladder' : moveType === 'SNAKE' ? 'snake' : 'info',
          message: `${findName(payload.player_id)} bergerak ${from} → ${to}.`,
        };
        break;
      }
      case 'LADDER_TRIGGERED':
        log = {
          id: env.event_id,
          timestamp: env.timestamp,
          type: 'ladder',
          message: `${findName(payload.player_id)} menaiki tangga "${payload.label || ''}" menuju kotak ${payload.to_position}!`,
        };
        break;
      case 'SNAKE_TRIGGERED':
        log = {
          id: env.event_id,
          timestamp: env.timestamp,
          type: 'snake',
          message: `${findName(payload.player_id)} terkena ular "${payload.label || ''}" dan turun ke kotak ${payload.to_position}.`,
        };
        break;
      case 'TURN_CHANGED':
        break;
      case 'LEADERBOARD_UPDATE':
        if (Array.isArray(payload.leaderboard)) {
          patch.leaderboard = payload.leaderboard as LeaderboardEntry[];
        }
        break;
      case 'GAME_OVER': {
        patch.screen = 'result';
        patch.gameResult = payload.result as GameResult;
        patch.confettiTrigger = state.confettiTrigger + 1;
        patch.lastWinnerId = (payload.result as GameResult | undefined)?.winner?.player_id || null;
        log = { id: env.event_id, timestamp: env.timestamp, type: 'win', message: 'Permainan selesai! Lihat hasil akhir.' };
        break;
      }
      case 'STATE_SYNC':
        break;
      case 'ERROR': {
        const code = String(payload.code || '');
        const msg = String(payload.message || 'Terjadi kesalahan.');
        if (code === 'NICKNAME_TAKEN' || code === 'NOT_YOUR_TURN' || code === 'ALREADY_ANSWERED') {
          get().pushToast(msg, 'error');
        }
        break;
      }
      default:
        break;
    }

    set((s) => ({
      ...patch,
      logs: log ? [...(s.logs || []), log].slice(-40) : s.logs,
    }));

    if (room?.status === 'QUESTION' && room.turn_state.active_question) {
      gameServer.reconcileRoomIfNeeded(auth.room_code);
    }
  },

  resetSession: () => {
    set({
      screen: 'menu',
      auth: null,
      room: null,
      players: [],
      leaderboard: [],
      gameResult: null,
      logs: [],
      connectionStatus: 'online',
      lastDiceValue: null,
      movementTarget: null,
      lastWinnerId: null,
    });
  },
}));

// Wire global WS listener once
let wsUnsub: (() => void) | null = null;
export function initializeGameStore() {
  if (wsUnsub) return;
  reloadSqlFromStorage();
  wsUnsub = gameServer.subscribe((env) => {
    useGameStore.getState().handleWSEvent(env);
  });
}

export function getCharacterById(id: string) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}

export function getMapById(id: string) {
  return MAP_THEMES.find((m) => m.id === id) || MAP_THEMES[0];
}

export function getTilePosition(tileNumber: number) {
  return getTilePercentPosition(tileNumber);
}

export function getMyPlayer(): Player | undefined {
  const { players, auth } = useGameStore.getState();
  if (!auth) return undefined;
  return players.find((p) => p.id === auth.player_id || p.id === auth.token);
}
