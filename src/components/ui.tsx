import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Loader2, X } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { CHARACTERS, MAP_THEMES } from '../data/mapsAndChars';
import { Player } from '../types/game';

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
    <div
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
    </div>
  );
}

export function CharacterAvatar({
  characterId,
  size = 'md',
  className = '',
}: {
  characterId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
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
    <div
      className={`relative shrink-0 rounded-full overflow-hidden bg-slate-100 ${sizeClass} ring-2 ring-white shadow-md ${className}`}
      style={{ borderBottom: `3px solid ${char.accent_color}` }}
    >
      <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover object-top" />
    </div>
  );
}

export function CharacterFigure({
  characterId,
  height = 80,
  className = '',
  bob = true,
}: {
  characterId: string;
  height?: number;
  className?: string;
  bob?: boolean;
}) {
  const char = getChar(characterId);
  return (
    <div
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
        animate={bob ? { y: [0, -3, 0] } : { y: 0 }}
        transition={{ duration: 2.1, repeat: bob ? Infinity : 0, ease: 'easeInOut' }}
        draggable={false}
      />
    </div>
  );
}

export function Pill({
  children,
  tone = 'slate',
  className = '',
}: {
  children: ReactNode;
  tone?: 'amber' | 'emerald' | 'sky' | 'rose' | 'slate' | 'violet';
  className?: string;
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
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${toneClass} ${className}`}
    >
      {children}
    </span>
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
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(code).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:translate-y-0.5 transition"
    >
      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
      {copied ? 'Tersalin!' : 'Salin PIN'}
    </button>
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
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          className={`fixed left-1/2 top-5 z-[100] flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur ${
            toast.tone === 'error'
              ? 'border-rose-300 bg-rose-50 text-rose-800'
              : toast.tone === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-sky-300 bg-sky-50 text-sky-800'
          }`}
        >
          <span>{toast.message}</span>
          <button onClick={onClose} className="opacity-60 hover:opacity-100" aria-label="Tutup notifikasi">
            <X size={16} />
          </button>
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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="mb-1 flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="mr-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              ← Kembali
            </button>
          )}
          <span className="font-mono-num text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">
            {eyebrow}
          </span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-300">{subtitle}</p>}
      </div>
      {right}
    </div>
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
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-300">
      <span className={`h-2 w-2 rounded-full ${color} shadow-[0_0_8px_${color}]`} />
      {label}
    </span>
  );
}
