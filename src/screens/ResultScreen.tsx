import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ArrowRight, Award, Crown, Home, RotateCcw, Trophy, Zap } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { CharacterAvatar, CharacterFigure, Pill, ScreenHeader } from '../components/ui';
import { MAP_THEMES } from '../data/mapsAndChars';
import { gameServer } from '../engine/gameServer';
import { soundFx } from '../utils/soundFx';
import { useGameStore } from '../store/gameStore';
import { LeaderboardEntry } from '../types/game';

export function ResultScreen() {
  const { gameResult, room, auth, setScreen, syncResult, resetSession, pushToast } = useGameStore();

  const celebratedRef = useRef(false);

  useEffect(() => {
    syncResult();
    if (!celebratedRef.current) {
      celebratedRef.current = true;
      confetti({
        particleCount: 180,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#f59e0b', '#10b981', '#38bdf8', '#ffffff'],
      });
    }
  }, [syncResult]);

  const result = gameResult || (room ? gameServer.getGameResult(room.code) : null);
  if (!result || !auth) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-white">
        <p>Hasil permainan belum tersedia.</p>
        <button onClick={() => setScreen('menu')} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-900">
          Kembali ke Menu
        </button>
      </div>
    );
  }

  const map = MAP_THEMES.find((m) => m.id === result.map_id) || MAP_THEMES[0];
  const podium: LeaderboardEntry[] = result.leaderboard.slice(0, 3);
  const maxScore = Math.max(1, ...result.leaderboard.map((l) => l.score));

  function handleRematch() {
    soundFx.playWin();
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#10b981', '#38bdf8'],
    });
    pushToast('Klik "Buat Room Baru" untuk mengulang permainan dengan pengaturan yang sama.', 'info');
    resetSession();
    setScreen('create_room');
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
      <ScreenHeader
        eyebrow="Game Over / Rekap Hasil"
        title="Permainan Selesai!"
        subtitle={`Room: ${result.room_name} · Tema: ${map.name} · Total giliran: ${result.total_turns}`}
        right={
          <button
            onClick={resetSession}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
          >
            <Home size={14} /> Menu Utama
          </button>
        }
      />

      {/* Winner banner */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 overflow-hidden rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-center shadow-2xl"
      >
        <div className="absolute inset-0 opacity-10">
          <img src={map.image_url} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-400/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-200">
            <Crown size={13} /> Pemenang Permainan
          </span>
          <div className="mt-4 flex justify-center">
            <div className="relative">
              <motion.div
                animate={{ y: [0, -7, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <CharacterFigure characterId={result.winner.character_id} height={104} className="drop-shadow-[0_0_18px_rgba(251,191,36,0.55)]" />
              </motion.div>
              <span className="absolute -right-3 -top-3 text-3xl">🏆</span>
            </div>
          </div>
          <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-4xl">{result.winner.nickname}</h2>
          <p className="mt-1 text-sm text-amber-200">
            Berhasil mencapai kotak {result.winner.position} dengan skor{' '}
            <strong className="font-mono-num">{result.winner.score.toLocaleString('id-ID')}</strong> poin.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Pill tone="amber">
              <Trophy size={12} /> {result.winner.correct_answers} jawaban benar
            </Pill>
            <Pill tone="emerald">
              <Zap size={12} /> Peringkat 1
            </Pill>
          </div>
        </div>
      </motion.section>

      {/* Podium */}
      <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur">
        <h3 className="mb-5 flex items-center gap-2 font-display text-lg font-bold text-white">
          <Award size={20} className="text-amber-300" /> Podium Tiga Besar
        </h3>
        <div className="flex items-end justify-center gap-2 sm:gap-5">
          {[podium[1], podium[0], podium[2]].filter(Boolean).map((p, idx) => {
            const rank = p.rank;
            const heights = ['h-24 sm:h-32', 'h-36 sm:h-44', 'h-20 sm:h-28'];
            const height = heights[rank - 1] || 'h-20';
            const colors =
              rank === 1
                ? 'from-amber-400 to-yellow-600'
                : rank === 2
                ? 'from-slate-300 to-slate-500'
                : 'from-orange-400 to-amber-700';
            return (
              <motion.div
                key={p.player_id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 * idx }}
                className="flex w-28 flex-col items-center sm:w-40"
              >
                {rank === 1 && <div className="mb-1 text-2xl">👑</div>}
                <CharacterFigure characterId={p.character_id} height={rank === 1 ? 84 : 68} />
                <div className="mt-1.5 max-w-full truncate text-center text-xs font-extrabold text-white">{p.nickname}</div>
                <div className="font-mono-num text-[10px] text-amber-200">{p.score.toLocaleString('id-ID')} poin</div>
                <div className={`mt-2 flex w-full items-start justify-center rounded-t-xl bg-gradient-to-b ${colors} px-2 pt-3 ${height}`}>
                  <span className="font-display text-3xl font-bold text-white/90">#{rank}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Full leaderboard */}
      <section className="board-card overflow-hidden rounded-2xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-display text-lg font-bold text-slate-900">Leaderboard Lengkap</h3>
          <p className="text-[11px] text-slate-500">
            Diurutkan berdasarkan skor, jumlah jawaban benar, lalu total waktu menjawab.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {result.leaderboard.map((entry) => (
            <motion.div
              key={entry.player_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
            >
              <span
                className={`font-mono-num flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                  entry.rank === 1 ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {entry.rank}
              </span>
              <CharacterAvatar characterId={entry.character_id} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-extrabold text-slate-900">{entry.nickname}</span>
                  {entry.player_id === auth.player_id && (
                    <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">KAMU</span>
                  )}
                  {entry.is_bot && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">BOT</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500">
                  Posisi akhir {entry.position} · {entry.correct_answers} jawaban benar ·{' '}
                  {(entry.total_answer_time_ms / 1000).toFixed(1)}s total waktu
                </div>
              </div>
              <div className="w-32">
                <div className="mb-1 text-right font-mono-num text-xs font-bold text-slate-800">
                  {entry.score.toLocaleString('id-ID')}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                    style={{ width: `${(entry.score / maxScore) * 100}%` }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 bg-slate-50 px-5 py-4">
          <button
            onClick={handleRematch}
            className="board-btn-primary inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-extrabold text-slate-900"
          >
            <RotateCcw size={16} /> Main Lagi
          </button>
          <button
            onClick={resetSession}
            className="board-btn-navy inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-extrabold text-white"
          >
            Kembali ke Menu <ArrowRight size={16} />
          </button>
          <div className="ml-auto self-center text-[10px] text-slate-500">
            Hasil tersimpan di database SQL lokal dengan kode room <strong>{result.room_code}</strong>.
          </div>
        </div>
      </section>
    </div>
  );
}
