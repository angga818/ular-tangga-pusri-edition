import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock3,
  Dices,
  Eye,
  Home,
  Lightbulb,
  Sparkles,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dice3D } from '../components/Dice3D';
import { PhaserBoard } from '../components/PhaserBoard';
import { CharacterAvatar, DifficultyBadge, getMap, Pill } from '../components/ui';
import { gameServer } from '../engine/gameServer';
import { backgroundMusic } from '../utils/backgroundMusic';
import { soundFx } from '../utils/soundFx';
import { useGameStore } from '../store/gameStore';
import { GameStatus } from '../types/game';

const DIFFICULTY_LABELS = ['', 'Sangat Mudah', 'Mudah', 'Menengah', 'Menengah Sulit', 'Sulit', 'Sangat Sulit'];

export function GameScreen() {
  const {
    room,
    players,
    leaderboard,
    auth,
    logs,
    lastDiceValue,
    movementTarget,
    refreshRoom,
    syncResult,
    pushToast,
    setScreen,
  } = useGameStore();

  const [countdown, setCountdown] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [showResultOverlay, setShowResultOverlay] = useState(false);

  const myPlayer = players.find((p) => p.id === auth?.player_id);
  const isSpectator = myPlayer?.is_spectator || auth?.role === 'host';
  const map = getMap(room?.map_id || '');
  const currentPlayer = players.find((p) => p.id === room?.current_player_id);
  const isMyTurn = currentPlayer?.id === auth?.player_id && !isSpectator;

  const question = room?.status === 'QUESTION' ? room.turn_state.active_question : null;
  const answerResult = room?.turn_state.last_answer_result;
  const showAnswerFeedback = room?.status === 'ANSWER_RESULT' && answerResult;

  const statusLabel: Record<GameStatus, string> = {
    LOBBY: 'Menunggu di lobby',
    STARTING: 'Menyiapkan permainan',
    TURN_START: 'Giliran dimulai',
    DICE_ROLLING: 'Dadu berputar',
    QUESTION: 'Saatnya menjawab',
    ANSWER_RESULT: 'Hasil jawaban',
    MOVING: 'Karakter bergerak',
    SNAKE_ANIMATION: 'Efek ular!',
    LADDER_ANIMATION: 'Efek tangga!',
    TURN_END: 'Giliran berakhir',
    GAME_OVER: 'Permainan selesai',
  };

  useEffect(() => {
    if (!auth) return;
    refreshRoom();
    const timer = window.setInterval(() => refreshRoom(), 1200);
    return () => window.clearInterval(timer);
  }, [auth, refreshRoom]);

  // Ganti backsound mengikuti tema map yang sedang dimainkan.
  useEffect(() => {
    backgroundMusic.playForTheme(map.id);
  }, [map.id]);

  useEffect(() => {
    if (room?.status === 'DICE_ROLLING') {
      setRolling(true);
      soundFx.playDiceRoll();
      const t = window.setTimeout(() => setRolling(false), 1400);
      return () => window.clearTimeout(t);
    }
    setRolling(false);
  }, [room?.status, room?.turn_state.animation_seed]);

  useEffect(() => {
    if (room?.status === 'ANSWER_RESULT' && answerResult) {
      if (answerResult.is_correct) soundFx.playCorrect();
      else soundFx.playWrong();
      setShowResultOverlay(true);
      const t = window.setTimeout(() => setShowResultOverlay(false), answerResult.is_correct ? 1400 : 1900);
      return () => window.clearTimeout(t);
    }
  }, [room?.status, answerResult?.question_id, answerResult?.is_correct]);

  useEffect(() => {
    if (room?.status === 'LADDER_ANIMATION') soundFx.playLadder();
    if (room?.status === 'SNAKE_ANIMATION') soundFx.playSnake();
  }, [room?.status, room?.turn_state.last_movement?.edge_id]);

  useEffect(() => {
    if (!question) {
      setCountdown(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, (question.deadline_ms - Date.now()) / 1000);
      setCountdown(remaining);
      if (remaining <= 0) refreshRoom();
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [question?.question_id, question?.deadline_ms, refreshRoom]);

  const prevConfettiRef = useRef(useGameStore((s) => s.confettiTrigger));
  const confettiTrigger = useGameStore((s) => s.confettiTrigger);
  useEffect(() => {
    if (confettiTrigger !== prevConfettiRef.current) {
      prevConfettiRef.current = confettiTrigger;
      soundFx.playWin();
      confetti({
        particleCount: 160,
        spread: 90,
        origin: { y: 0.55 },
        colors: ['#fbbf24', '#f59e0b', '#10b981', '#38bdf8', '#ffffff'],
      });
      syncResult();
      setScreen('result');
    }
  }, [confettiTrigger]);

  const handleRoll = () => {
    if (!room || !myPlayer) return;
    try {
      gameServer.rollDice(room.code, myPlayer.id);
      refreshRoom();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal melempar dadu.', 'error');
    }
  };

  const handleAnswer = (optionId: string) => {
    if (!room || !myPlayer || !question || room.turn_state.answered_option_id) return;
    try {
      gameServer.submitAnswer(room.code, myPlayer.id, question.question_id, optionId);
      refreshRoom();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Gagal mengirim jawaban.', 'error');
    }
  };

  const liveLeaderboard = useMemo(() => {
    return leaderboard.length ? leaderboard : gameServer.computeLeaderboard(room?.code || '');
  }, [leaderboard, room?.code]);

  if (!room || !auth) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-white">Memulihkan sesi permainan...</div>
    );
  }

  const canRoll = room.status === 'TURN_START' && isMyTurn;
  const canAnswer = room.status === 'QUESTION' && isMyTurn && !room.turn_state.answered_option_id && countdown > 0;

  // Spectator info banner
  if (isSpectator && myPlayer) {
    // Spectators still see the board but with a banner
  }

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5">
      {/* Spectator banner */}
      {isSpectator && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-center"
        >
          <Eye size={18} className="text-amber-600 shrink-0" />
          <div className="text-sm font-bold text-amber-800">
            Mode Pengamat — Kamu menonton permainan ini. Hanya pemain yang bisa melempar dadu & menjawab.
          </div>
        </motion.div>
      )}

      {/* Top bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              useGameStore.getState().resetSession();
            }}
            className="rounded-lg border border-white/20 bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
          >
            <Home size={14} className="mr-1.5 inline" /> Menu
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-white sm:text-2xl">{room.name}</h1>
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <span className="font-mono-num">PIN {room.code}</span>
              <span className="text-slate-600">•</span>
              <span>{map.name}</span>
              <span className="text-slate-600">•</span>
              <span>Giliran ke-{room.current_turn}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={room.status === 'GAME_OVER' ? 'violet' : isMyTurn ? 'amber' : isSpectator ? 'amber' : 'slate'}>
            {isSpectator ? `👁 Mengamati: ${currentPlayer?.nickname || '-'}` : isMyTurn ? '★ Giliran Kamu' : `Giliran ${currentPlayer?.nickname || '-'}`}
          </Pill>
          <Pill tone="slate">
            <Clock3 size={11} /> {statusLabel[room.status]}
          </Pill>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Board + dice action */}
        <div className="min-w-0 space-y-4">
          <PhaserBoard
            map={map}
            players={players}
            currentPlayerId={room.current_player_id}
            movementTarget={movementTarget}
            myPlayerId={auth.player_id}
            status={room.status}
          />

          {/* Turn control strip */}
          <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
            <div className="board-card flex items-center justify-center gap-4 rounded-2xl px-5 py-4">
              <Dice3D value={lastDiceValue || (room.turn_state.dice_value ?? null)} rolling={rolling} size="lg" />
              <div className="min-w-[130px]">
                <div className="font-display text-sm font-bold text-slate-900">
                  {lastDiceValue || room.turn_state.dice_value
                    ? `Dadu: ${lastDiceValue || room.turn_state.dice_value}`
                    : 'Belum melempar'}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">
                  {lastDiceValue || room.turn_state.dice_value
                    ? `Tingkat kesulitan ${lastDiceValue || room.turn_state.dice_value}`
                    : 'Tunggu giliranmu'}
                </div>
                <AnimatePresence mode="wait">
                  {canRoll && (
                    <motion.button
                      key="roll"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleRoll}
                      className="board-btn-primary mt-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-amber-400 to-orange-500 px-3.5 py-2 text-xs font-extrabold text-slate-900"
                    >
                      <Dices size={15} /> Lempar Dadu
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="board-card rounded-2xl p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentPlayer && <CharacterAvatar characterId={currentPlayer.character_id} size="sm" />}
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">
                      {currentPlayer?.nickname || '-'}
                      {currentPlayer?.is_bot && <span className="ml-1 text-[9px] text-slate-400">(Bot)</span>}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Posisi saat ini · Kotak {currentPlayer?.position ?? 1}
                    </div>
                  </div>
                </div>
                {room.turn_state.active_question && <DifficultyBadge difficulty={room.turn_state.active_question.difficulty} />}
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                  animate={{ width: `${((currentPlayer?.position || 1) / 100) * 100}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[9px] font-bold text-slate-400">
                <span>1 · START</span>
                <span>50</span>
                <span>100 · FINISH</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Leaderboard */}
          <section className="board-card rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Trophy size={17} className="text-amber-600" />
                <h2 className="font-display text-sm font-bold text-slate-900">Papan Skor</h2>
              </div>
              <span className="text-[9px] font-bold uppercase text-slate-400">Live</span>
            </div>
            <div className="space-y-1.5">
              {liveLeaderboard.map((entry) => (
                <motion.div
                  key={entry.player_id}
                  layout
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                    entry.player_id === room.current_player_id
                      ? 'border-amber-400 bg-amber-50'
                      : entry.player_id === auth.player_id
                      ? 'border-sky-300 bg-sky-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <span
                    className={`font-mono-num flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                      entry.rank === 1 ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {entry.rank}
                  </span>
                  <CharacterAvatar characterId={entry.character_id} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-extrabold text-slate-800">
                      {entry.nickname}
                      {entry.player_id === auth.player_id && <span className="ml-1 text-[8px] text-sky-600">(Kamu)</span>}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      Kotak {entry.position} · {entry.correct_answers} benar
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono-num text-xs font-bold text-slate-900">{entry.score.toLocaleString('id-ID')}</div>
                    <div className="text-[8px] text-slate-400">poin</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Score explanation */}
          <section className="board-card rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2">
              <Zap size={16} className="text-violet-600" />
              <h2 className="font-display text-sm font-bold text-slate-900">Skor Kamu</h2>
            </div>
            <div className="font-mono-num text-3xl font-bold text-slate-900">
              {(myPlayer?.score || 0).toLocaleString('id-ID')}
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
              Poin dihitung otomatis oleh server berdasarkan kecepatan menjawab dan tingkat kesulitan dadu.
            </p>
          </section>

          {/* Game log */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur">
            <h2 className="mb-2 font-display text-sm font-bold text-white">Riwayat Permainan</h2>
            <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <p className="text-[11px] text-slate-400">Belum ada aktivitas tercatat.</p>
              ) : (
                [...logs].reverse().map((log) => (
                  <div key={log.id} className="flex gap-2 text-[10px] leading-snug">
                    <span
                      className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                        log.type === 'correct'
                          ? 'bg-emerald-400'
                          : log.type === 'wrong'
                          ? 'bg-rose-400'
                          : log.type === 'snake'
                          ? 'bg-orange-400'
                          : log.type === 'ladder'
                          ? 'bg-teal-400'
                          : log.type === 'dice'
                          ? 'bg-amber-400'
                          : 'bg-slate-500'
                      }`}
                    />
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Question Modal */}
      <AnimatePresence>
        {question && room.status === 'QUESTION' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              className="board-card relative max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-5 sm:p-7"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-violet-700">Pertanyaan</div>
                    <div className="text-xs font-bold text-slate-700">
                      {isSpectator
                        ? 'Mode pengamat — menonton pemain menjawab...'
                        : isMyTurn
                        ? 'Giliranmu — pilih satu jawaban!'
                        : `${currentPlayer?.nickname} sedang menjawab...`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DifficultyBadge difficulty={question.difficulty} />
                  <span
                    className={`font-mono-num inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-bold ${
                      countdown <= 5 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Clock3 size={14} /> {countdown.toFixed(1)}s
                  </span>
                </div>
              </div>

              <div className="relative mb-4 h-2 overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  className={`h-full ${countdown <= 5 ? 'bg-rose-500' : 'bg-gradient-to-r from-violet-500 to-purple-500'}`}
                  style={{ width: `${Math.min(100, (countdown / question.time_limit_sec) * 100)}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>

              <h2 className="font-display text-lg font-bold leading-snug text-slate-900 sm:text-xl">
                {question.question_text}
              </h2>
              <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Kategori: {question.category} · Dadu: {question.difficulty} ({DIFFICULTY_LABELS[question.difficulty]})
              </div>

              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {question.options.map((opt, idx) => {
                  const disabled = !canAnswer || Boolean(room.turn_state.answered_option_id) || isSpectator;
                  const isSelected = room.turn_state.answered_option_id === opt.id;
                  return (
                    <motion.button
                      key={opt.id}
                      whileHover={disabled ? {} : { scale: 1.015, x: 3 }}
                      whileTap={disabled ? {} : { scale: 0.985 }}
                      disabled={disabled}
                      onClick={() => handleAnswer(opt.id)}
                      className={`flex items-start gap-3 rounded-xl border-2 p-3.5 text-left transition ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-slate-300 bg-white hover:border-violet-400'
                      } disabled:cursor-default disabled:opacity-75`}
                    >
                      <span
                        className={`font-mono-num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          isSelected ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="pt-0.5 text-sm font-semibold leading-snug text-slate-800">{opt.text}</span>
                    </motion.button>
                  );
                })}
              </div>

              {!isMyTurn && !isSpectator && (
                <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-slate-100 p-3 text-xs font-semibold text-slate-600">
                  <Lightbulb size={15} className="text-amber-500" /> Menunggu jawaban pemain yang sedang bergiliran...
                </div>
              )}
              {isSpectator && (
                <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-700">
                  <Eye size={15} className="text-amber-500" /> Menonton {currentPlayer?.nickname || 'pemain'} menjawab...
                </div>
              )}
              {isMyTurn && countdown <= 5 && countdown > 0 && (
                <div className="mt-4 text-center text-xs font-bold text-rose-600">⚡ Cepat, waktu hampir habis!</div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answer result overlay */}
      <AnimatePresence>
        {showResultOverlay && showAnswerFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.75, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`max-w-md rounded-2xl border-4 px-6 py-5 text-center shadow-2xl ${
                answerResult.is_correct
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-rose-400 bg-rose-50'
              }`}
            >
              <div className="mb-2 flex justify-center">
                {answerResult.is_correct ? (
                  <CheckCircle2 size={42} className="text-emerald-600" />
                ) : (
                  <XCircle size={42} className="text-rose-600" />
                )}
              </div>
              <div
                className={`font-display text-2xl font-bold ${
                  answerResult.is_correct ? 'text-emerald-800' : 'text-rose-800'
                }`}
              >
                {answerResult.is_correct
                  ? 'Benar! 🎉'
                  : answerResult.is_timeout
                  ? 'Waktu Habis! ⏰'
                  : 'Jawaban Salah'}
              </div>
              {answerResult.is_correct && (
                <div className="font-mono-num mt-1 text-lg font-bold text-emerald-700">
                  +{answerResult.points_earned.toLocaleString('id-ID')} poin
                </div>
              )}
              {!answerResult.is_correct && answerResult.correct_option_id && (
                <div className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-700">
                  Jawaban yang benar:{' '}
                  <strong className="text-emerald-800">
                    {room.turn_state.active_question?.options.find(
                      (o) => o.id === answerResult.correct_option_id
                    )?.text || '-'}
                  </strong>
                </div>
              )}
              {answerResult.overshoot_100 && (
                <div className="mt-2 text-xs font-bold text-amber-700">
                  Angka dadu membuat posisi melewati kotak 100 — tetap di posisi sebelumnya.
                </div>
              )}
              <div className="mt-2 text-[11px] leading-relaxed text-slate-600">{answerResult.explanation}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snake / Ladder banner */}
      <AnimatePresence>
        {(room.status === 'SNAKE_ANIMATION' || room.status === 'LADDER_ANIMATION') && (
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            className={`fixed bottom-6 right-6 z-30 flex max-w-xs items-center gap-3 rounded-2xl border-2 px-4 py-3 shadow-2xl ${
              room.status === 'LADDER_ANIMATION'
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-rose-400 bg-rose-50'
            }`}
          >
            <span className="text-2xl">{room.status === 'LADDER_ANIMATION' ? '🪜' : '🐍'}</span>
            <div>
              <div
                className={`font-display text-sm font-bold ${
                  room.status === 'LADDER_ANIMATION' ? 'text-emerald-900' : 'text-rose-900'
                }`}
              >
                {room.status === 'LADDER_ANIMATION' ? 'Naik Tangga!' : 'Terkena Ular!'}
              </div>
              <div className="text-[11px] text-slate-600">
                {room.turn_state.last_movement?.from_position} → {room.turn_state.last_movement?.to_position}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
