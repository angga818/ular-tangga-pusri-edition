import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Loader2, X } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { CHARACTERS, MAP_THEMES } from '../data/mapsAndChars';
import { Player } from '../types/game';
import {
  cardVariants,
  cardTransition,
  characterEntranceVariants,
  characterEntranceTransition,
  toastVariants,
  toastTransition,
} from '../utils/animations';

export function getChar(id: string) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}

export function getMap(id: string) {
  return MAP_THEMES.find((m) => m.id === id) || MAP_THEMES[0];
}

export function PlayerAvatar({
  player,
  size = 'md',
  showRing = true,
  className = '',
}: {
  player: Player;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showRing?: boolean;
  className?: string;
}) {
  const char = getChar(player.character_id);
  const sizeClass =
    size === 'sm'
      ? 'w-9 h-9'
      : size === 'md'
      ? 'w-12 h-12'
      : size === 'lg'
      ? 'w-16 h-16'
      : 'w-20 h-20';
  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={cardTransition}
      className={`relative shrink-0 rounded-full overflow-hidden bg-slate-100 ${sizeClass} ${
        showRing ? 'ring-2 ring-white shadow-md' : ''
      } ${className}`}
      style={{ borderBottom: `3px solid ${char.accent_color}` }}
      title={player.nickname}
    >
      <img src={char.avatar_url} alt={player.nickname} className="w-full h-full object-cover object-top" />
      {!player.is_connected && (
        <span className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-[10px] font-bold">
          OFF
        </span>
      )}
    </motion.div>
  );
}

export function CharacterAvatar({
  characterId,
  size = 'md',
  className = '',
  animated = true,
}: {
  characterId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animated?: boolean;
}) {
  const char = getChar(characterId);
  const sizeClass =
    size === 'sm'
      ? 'w-9 h-9'
      : size === 'md'
      ? 'w-12 h-12'
      : size === 'lg'
      ? 'w-16 h-16'
      : 'w-20 h-20';
  return (
    <motion.div
      variants={animated ? cardVariants : undefined}
      initial={animated ? 'initial' : undefined}
      animate={animated ? 'animate' : undefined}
      exit={animated ? 'exit' : undefined}
      transition={animated ? cardTransition : undefined}
      className={`relative shrink-0 rounded-full overflow-hidden bg-slate-100 ${sizeClass} ring-2 ring-white shadow-md ${className}`}
      style={{ borderBottom: `3px solid ${char.accent_color}` }}
    >
      <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover object-top" />
    </motion.div>
  );
}

export function CharacterFigure({
  characterId,
  height = 80,
  className = '',
  bob = true,
  animated = true,
}: {
  characterId: string;
  height?: number;
  className?: string;
  bob?: boolean;
  animated?: boolean;
}) {
  const char = getChar(characterId);
  return (
    <motion.div
      variants={animated ? characterEntranceVariants : undefined}
      initial={animated ? 'initial' : undefined}
      animate={animated ? 'animate' : undefined}
      transition={animated ? characterEntranceTransition : undefined}
      className={`relative inline-flex items-end justify-center ${className}`}
      style={{ height }}
      title={char.name}
    >
      <span className="absolute bottom-0 h-2.5 w-[72%] rounded-[50%] bg-slate-950/55 blur-[3px]" />
      <span
        className="absolute bottom-0 h-1 w-[78%] rounded-full opacity-80"
        style={{ background: `linear-gradient(90deg, transparent, ${char.accent_color}, transparent)` }}
      />
      <motion.img
        src={char.image_url}
        alt={char.name}
        className="relative z-[1] h-full w-auto max-w-none select-none object-contain object-bottom"
        style={{ filter: `drop-shadow(0 6px 5px rgba(2, 6, 23, 0.5))` }}
        animate={animated && bob ? { y: [0, -4, 0] } : { y: 0 }}
        transition={animated && bob ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
        draggable={false}
      />
    </motion.div>
  );
}

export function Pill({
  children,
  tone = 'slate',
  className = '',
  animated = true,
}: {
  children: ReactNode;
  tone?: 'amber' | 'emerald' | 'sky' | 'rose' | 'slate' | 'violet';
  className?: string;
  animated?: boolean;
}) {
  const toneClass = {
    amber: 'bg-amber-100 text-amber-800 border-amber-300',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    sky: 'bg-sky-100 text-sky-800 border-sky-300',
    rose: 'bg-rose-100 text-rose-800 border-rose-300',
    slate: 'bg-slate-100 text-slate-700 border-slate-300',
    violet: 'bg-violet-100 text-violet-800 border-violet-300',
  }[tone];
  return (
    <motion.span
      variants={animated ? cardVariants : undefined}
      initial={animated ? 'initial' : undefined}
      animate={animated ? 'animate' : undefined}
      transition={animated ? cardTransition : undefined}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${toneClass} ${className}`}
      whileHover={animated ? { scale: 1.02 } : undefined}
      whileTap={animated ? { scale: 0.98 } : undefined}
    >
      {children}
    </motion.span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: number }) {
  const labels = ['', 'Sangat Mudah', 'Mudah', 'Menengah', 'Menengah Sulit', 'Sulit', 'Sangat Sulit'];
  const tones = ['', 'emerald', 'emerald', 'amber', 'amber', 'rose', 'violet'] as const;
  return (
    <Pill tone={tones[difficulty] || 'slate'}>
      <span className="font-mono-num">Lv.{difficulty}</span> · {labels[difficulty] || '?'} 
    </Pill>
  );
}

export function CopyPinButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(code).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        });
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div key="copied" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
            <Check size={14} className="text-emerald-600" />
          </motion.div>
        ) : (
          <motion.div key="copy" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
            <Copy size={14} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span key="copied-text" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            Tersalin!
          </motion.span>
        ) : (
          <motion.span key="copy-text" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            Salin PIN
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function ToastHost({
  toast,
  onClose,
}: {
  toast: { id: number; message: string; tone: 'success' | 'error' | 'info' } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          variants={toastVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={toastTransition}
          className={`fixed left-1/2 top-5 z-[100] flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur ${
            toast.tone === 'error'
              ? 'border-rose-300 bg-rose-50 text-rose-800'
              : toast.tone === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-sky-300 bg-sky-50 text-sky-800'
          }`}
        >
          <span>{toast.message}</span>
          <motion.button
            onClick={onClose}
            className="opacity-60 hover:opacity-100"
            aria-label="Tutup notifikasi"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X size={16} />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  onBack,
  right,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mb-5 flex flex-wrap items-end justify-between gap-3"
    >
      <div>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="mb-1 flex items-center gap-2"
        >
          {onBack && (
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mr-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              ← Kembali
            </motion.button>
          )}
          <span className="font-mono-num text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">
            {eyebrow}
          </span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-300"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
      >
        {right}
      </motion.div>
    </motion.div>
  );
}

export function ConnectionDot({ status }: { status: 'offline' | 'connecting' | 'online' | 'reconnecting' }) {
  const color =
    status === 'online'
      ? 'bg-emerald-400'
      : status === 'connecting'
      ? 'bg-amber-400'
      : status === 'reconnecting'
      ? 'bg-orange-400'
      : 'bg-rose-400';
  const label =
    status === 'online' ? 'Terhubung' : status === 'connecting' ? 'Menghubungkan' : status === 'reconnecting' ? 'Sinkronisasi' : 'Terputus';
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-300"
    >
      <motion.span
        className={`h-2 w-2 rounded-full ${color} shadow-[0_0_8px_${color}]`}
        animate={status === 'online' || status === 'connecting' || status === 'reconnecting' ? { scale: [1, 1.3, 1] } : undefined}
        transition={status === 'online' || status === 'connecting' || status === 'reconnecting' ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : undefined}
      />
      {label}
    </motion.span>
  );
}
