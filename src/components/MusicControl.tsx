import { motion } from 'framer-motion';
import { AlertTriangle, Music2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { backgroundMusic, useBackgroundMusic } from '../utils/backgroundMusic';

const BAR_HEIGHTS = [6, 12, 9, 14, 7];

export function MusicControl() {
  const music = useBackgroundMusic();
  const isActive = music.enabled && music.playing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.35 }}
      className="fixed bottom-4 left-4 z-40 flex items-center gap-2.5 rounded-2xl border border-white/15 bg-slate-900/85 px-3 py-2 shadow-[0_16px_40px_-12px_rgba(0,0,0,.8)] backdrop-blur-md"
    >
      <button
        type="button"
        onClick={() => backgroundMusic.toggleEnabled()}
        aria-label={music.enabled ? 'Jeda musik latar' : 'Putar musik latar'}
        title={music.enabled ? 'Jeda musik latar (Alt+B)' : 'Putar musik latar (Alt+B)'}
        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
          music.enabled
            ? 'border-amber-400/50 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25'
            : 'border-white/15 bg-white/5 text-slate-400 hover:bg-white/10'
        }`}
      >
        {music.enabled ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      <div className="hidden min-w-[132px] sm:block">
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-200">
          <Music2 size={11} />
          <span className="max-w-[150px] truncate normal-case tracking-normal text-slate-200">
            {music.trackLabel}
          </span>
          {music.error && (
            <span title={music.error} className="text-rose-400">
              <AlertTriangle size={11} />
            </span>
          )}
        </div>
        <div className="mt-1 flex h-3.5 items-end gap-[3px]">
          {BAR_HEIGHTS.map((height, index) => (
            <motion.span
              key={index}
              className="w-[3px] rounded-full bg-gradient-to-t from-amber-500 to-amber-300"
              animate={
                isActive
                  ? { height: [4, height, 5] }
                  : { height: 3 }
              }
              transition={{
                duration: 0.9 + index * 0.12,
                repeat: isActive ? Infinity : 0,
                repeatType: 'mirror',
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => backgroundMusic.toggleMute()}
        aria-label={music.muted ? 'Nyalakan suara musik' : 'Matikan suara musik'}
        title={music.muted ? 'Unmute musik' : 'Mute musik'}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
          music.muted
            ? 'border-rose-400/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
            : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
        }`}
      >
        {music.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
      </button>

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={music.volume}
        onChange={(e) => backgroundMusic.setVolume(Number(e.target.value))}
        aria-label="Volume musik latar"
        title={`Volume musik: ${Math.round(music.volume * 100)}%`}
        className="h-1.5 w-20 cursor-pointer accent-amber-400 sm:w-24"
      />

      <span className="font-mono-num w-8 text-right text-[10px] font-bold text-slate-400">
        {Math.round(music.volume * 100)}%
      </span>
    </motion.div>
  );
}
