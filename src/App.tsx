import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { MusicControl } from './components/MusicControl';
import { ToastHost } from './components/ui';
import { initSqlDatabase } from './db/sqlDatabase';
import { CreateRoom } from './screens/CreateRoom';
import { GameScreen } from './screens/GameScreen';
import { HowToPlay } from './screens/HowToPlay';
import { JoinRoom } from './screens/JoinRoom';
import { Lobby } from './screens/Lobby';
import { MainMenu } from './screens/MainMenu';
import { QuestionBank } from './screens/QuestionBank';
import { ResultScreen } from './screens/ResultScreen';
import { initializeGameStore, useGameStore } from './store/gameStore';
import { backgroundMusic } from './utils/backgroundMusic';
import { soundFx } from './utils/soundFx';

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const toast = useGameStore((s) => s.toast);
  const clearToast = useGameStore((s) => s.clearToast);
  const pushToast = useGameStore((s) => s.pushToast);

  useEffect(() => {
    initSqlDatabase();
    initializeGameStore();
    backgroundMusic.init();
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
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient decorations */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute left-1/2 top-0 h-64 w-[600px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
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
          {screen === 'menu' && <MainMenu />}
          {screen === 'create_room' && <CreateRoom />}
          {screen === 'join_room' && <JoinRoom />}
          {screen === 'lobby' && <Lobby />}
          {screen === 'game' && <GameScreen />}
          {screen === 'result' && <ResultScreen />}
          {screen === 'question_bank' && <QuestionBank />}
          {screen === 'how_to_play' && <HowToPlay />}
        </motion.div>
      </AnimatePresence>

      <footer className="relative z-10 border-t border-white/10 py-4 text-center text-[10px] text-slate-500">
        Ular Tangga Edukasi · PUSRI Edition v1.1 · React · Vite · Tailwind · Framer Motion · Phaser · Howler · alasql
        <span className="mx-2">·</span>
        <kbd className="rounded border border-white/20 px-1">Alt+M</kbd> efek suara
        <span className="mx-1">·</span>
        <kbd className="rounded border border-white/20 px-1">Alt+B</kbd> musik latar
      </footer>
    </div>
  );
}
