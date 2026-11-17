import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense, useEffect } from 'react';
import { MusicControl } from './components/MusicControl';
import { ToastHost } from './components/ui';
import { initSqlDatabase } from './db/sqlDatabase';
import { MainMenu } from './screens/MainMenu';
import { initializeGameStore, useGameStore } from './store/gameStore';
import { backgroundMusic } from './utils/backgroundMusic';
import { soundFx } from './utils/soundFx';

/**
 * Code splitting: layar yang berat dimuat saat dibutuhkan saja.
 * MainMenu tetap eager karena itu layar pertama yang langsung dibuka.
 */
const CreateRoom = lazy(() => import('./screens/CreateRoom').then((m) => ({ default: m.CreateRoom })));
const GameScreen = lazy(() => import('./screens/GameScreen').then((m) => ({ default: m.GameScreen })));
const HowToPlay = lazy(() => import('./screens/HowToPlay').then((m) => ({ default: m.HowToPlay })));
const JoinRoom = lazy(() => import('./screens/JoinRoom').then((m) => ({ default: m.JoinRoom })));
const Lobby = lazy(() => import('./screens/Lobby').then((m) => ({ default: m.Lobby })));
const QuestionBank = lazy(() => import('./screens/QuestionBank').then((m) => ({ default: m.QuestionBank })));
const ResultScreen = lazy(() => import('./screens/ResultScreen').then((m) => ({ default: m.ResultScreen })));

function ScreenFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-300">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-600 border-t-amber-400" />
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Memuat...</span>
      </div>
    </div>
  );
}

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const toast = useGameStore((s) => s.toast);
  const clearToast = useGameStore((s) => s.clearToast);
  const pushToast = useGameStore((s) => s.pushToast);

  useEffect(() => {
    initSqlDatabase();
    initializeGameStore();
    // Audio TIDAK di-preload di sini — Howl baru dibuat setelah interaksi
    // pengguna (klik/touch), agar unduhan WAV 1,3 MB tidak merusak First Load.
    backgroundMusic.prepare();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm' && e.altKey) {
        soundFx.muted = !soundFx.muted;
        pushToast(soundFx.muted ? 'Suara dimatikan (Alt+M)' : 'Suara dinyalakan (Alt+M)', 'info');
      }
      if (e.key.toLowerCase() === 'b' && e.altKey) {
        backgroundMusic.toggleEnabled();
        pushToast(
          backgroundMusic.isEnabled() ? 'Musik latar diputar (Alt+B)' : 'Musik latar dijeda (Alt+B)',
          'info',
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pushToast]);

  return (
    <div className="relative min-h-screen min-h-[100dvh] overflow-x-hidden">
      {/* Ambient decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="app-ambient-blur absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="app-ambient-blur absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="app-ambient-blur absolute left-1/2 top-0 h-64 w-[min(600px,120vw)] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <ToastHost toast={toast} onClose={clearToast} />
      <MusicControl />

      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
        >
          <Suspense fallback={<ScreenFallback />}>
            {screen === 'menu' && <MainMenu />}
            {screen === 'create_room' && <CreateRoom />}
            {screen === 'join_room' && <JoinRoom />}
            {screen === 'lobby' && <Lobby />}
            {screen === 'game' && <GameScreen />}
            {screen === 'result' && <ResultScreen />}
            {screen === 'question_bank' && <QuestionBank />}
            {screen === 'how_to_play' && <HowToPlay />}
          </Suspense>
        </motion.div>
      </AnimatePresence>

      <footer className="no-print relative z-10 border-t border-white/10 px-3 py-4 text-center text-[10px] leading-relaxed text-slate-500">
        <span className="hidden sm:inline">
          Ular Tangga Edukasi · PUSRI Edition v1.1 · React · Vite · Tailwind · Framer Motion · Phaser · Howler · alasql
        </span>
        <span className="sm:hidden">Ular Tangga Edukasi · PUSRI Edition v1.1</span>
        <span className="mx-2">·</span>
        <kbd className="rounded border border-white/20 px-1">Alt+M</kbd> efek suara
        <span className="mx-1">·</span>
        <kbd className="rounded border border-white/20 px-1">Alt+B</kbd> musik latar
      </footer>
    </div>
  );
}
