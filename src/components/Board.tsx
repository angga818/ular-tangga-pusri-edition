import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { getTilePercentPosition } from '../data/mapsAndChars';
import { MapTheme, Player } from '../types/game';
import { getChar } from './ui';

interface BoardProps {
  map: MapTheme;
  players: Player[];
  currentPlayerId: string | null;
  movementTarget: {
    player_id: string;
    from_position: number;
    to_position: number;
    movement_type: 'NORMAL' | 'SNAKE' | 'LADDER';
    edge_id?: string;
    key: number;
  } | null;
  myPlayerId?: string;
  compact?: boolean;
  showNumbers?: boolean;
}

function PlayerToken({
  player,
  position,
  allPlayersAtTile,
  isCurrent,
  isMe,
  animateKey,
  movementType,
  fromTile,
  indexInStack,
  compact,
}: {
  player: Player;
  position: number;
  allPlayersAtTile: number;
  isCurrent: boolean;
  isMe: boolean;
  animateKey: number;
  movementType: 'NORMAL' | 'SNAKE' | 'LADDER' | null;
  fromTile: number | null;
  indexInStack: number;
  compact: boolean;
}) {
  const char = getChar(player.character_id);
  const pos = getTilePercentPosition(position);
  const fromPos = fromTile ? getTilePercentPosition(fromTile) : null;
  const tileSpanX = 6.4;
  const tileSpanY = 5.6;
  const stackOffsetX = allPlayersAtTile > 1 ? (indexInStack - (allPlayersAtTile - 1) / 2) * tileSpanX * 0.55 : 0;
  const stackOffsetY = allPlayersAtTile > 1 ? (indexInStack - (allPlayersAtTile - 1) / 2) * tileSpanY * 0.35 : 0;

  const targetX = pos.x + stackOffsetX;
  const targetY = pos.y + stackOffsetY;

  const steps = movementType && fromTile ? Math.max(1, Math.abs(position - fromTile)) : 0;
  const duration = movementType === 'SNAKE' ? 1.5 : movementType === 'LADDER' ? 1.3 : Math.min(1.9, 0.18 + steps * 0.2);

  const keyframes: Record<string, string[]> = {
    left: [`${targetX}%`],
    top: [`${targetY}%`],
  };
  if (fromPos && movementType) {
    const path: string[] = [];
    const count = steps > 1 ? steps : 4;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const baseY = fromPos.y + (targetY - fromPos.y) * t;
      if (movementType === 'NORMAL') {
        path.push(`${baseY - Math.sin(t * Math.PI) * 2.4}%`);
      } else {
        path.push(`${baseY}%`);
      }
    }
    keyframes.top = path;
    keyframes.left = path.map((_, i) => {
      const t = i / count;
      return `${fromPos.x + (targetX - fromPos.x) * t}%`;
    });
  }

  return (
    <motion.div
      key={`${player.id}-${animateKey}`}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      initial={{ left: `${targetX}%`, top: `${targetY}%`, scale: 0.4, opacity: 0 }}
      animate={{
        left: keyframes.left.length > 1 ? keyframes.left : `${targetX}%`,
        top: keyframes.top.length > 1 ? keyframes.top : `${targetY}%`,
        scale: 1,
        opacity: 1,
      }}
      transition={{
        duration,
        ease: movementType === 'SNAKE' ? 'easeIn' : movementType === 'LADDER' ? 'easeOut' : 'easeInOut',
      }}
      style={{ width: compact ? 30 : 40 }}
    >
      <div className="relative">
        <motion.div
          animate={
            isCurrent
              ? { y: [0, -4, 0], filter: ['drop-shadow(0 3px 3px rgba(0,0,0,.4))', 'drop-shadow(0 7px 6px rgba(251,191,36,.7))', 'drop-shadow(0 3px 3px rgba(0,0,0,.4))'] }
              : {}
          }
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {isMe && (
            <span
              className="absolute -inset-1.5 rounded-full border-2 border-dashed border-amber-300/90 animate-[spin_5s_linear_infinite]"
              style={{ borderRadius: '50%' }}
            />
          )}
          <div
            className={`overflow-hidden rounded-full ring-2 shadow-lg ${
              isCurrent ? 'ring-amber-300' : 'ring-white'
            }`}
            style={{
              backgroundColor: char.accent_color,
              width: compact ? 30 : 40,
              height: compact ? 30 : 40,
              borderBottom: `3px solid ${char.accent_color}`,
            }}
          >
            <img
              src={char.avatar_url}
              alt={player.nickname}
              className="h-full w-full object-cover object-top"
              draggable={false}
            />
          </div>
        </motion.div>
        <span
          className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[9px] font-black leading-none shadow-md ${
            isCurrent ? 'bg-amber-400 text-slate-900' : 'bg-white/95 text-slate-700'
          } ${compact ? 'hidden' : ''}`}
        >
          {player.nickname.length > 9 ? `${player.nickname.slice(0, 8)}…` : player.nickname}
        </span>
      </div>
    </motion.div>
  );
}

export function GameBoard({ map, players, currentPlayerId, movementTarget, myPlayerId, compact = false, showNumbers = true }: BoardProps) {
  const tileMap = useMemo(() => {
    const m = new Map<number, Player[]>();
    for (const p of players) {
      const arr = m.get(p.position) || [];
      arr.push(p);
      m.set(p.position, arr);
    }
    return m;
  }, [players]);

  const movingPlayerId = movementTarget?.player_id;
  const movementFrom = movementTarget?.from_position ?? null;
  const movementType = movementTarget?.movement_type ?? null;
  const movementKey = movementTarget?.key ?? 0;

  return (
    <div className="relative w-full select-none overflow-hidden rounded-xl border-[3px] border-amber-900/70 bg-amber-50 shadow-[0_16px_40px_-12px_rgba(0,0,0,.6)]">
      <img
        src={map.image_url}
        alt={`Papan permainan tema ${map.name}`}
        className="block w-full"
        draggable={false}
      />

      {/* Tile numbers — positioned with the SAME perspective geometry as the tokens,
          so every label always sits on its matching tile. */}
      {showNumbers &&
        Array.from({ length: 100 }, (_, idx) => idx + 1).map((n) => {
          const pos = getTilePercentPosition(n);
          const isHeadSnake = map.snakes.some((s) => s.from === n);
          const isTailSnake = map.snakes.some((s) => s.to === n);
          const isLadderStart = map.ladders.some((l) => l.from === n);
          const isLadderEnd = map.ladders.some((l) => l.to === n);
          const isCurrentTile = players.some((p) => p.id === currentPlayerId && p.position === n);
          return (
            <span
              key={n}
              className={`font-mono-num pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-[3px] px-[2px] leading-tight ${
                compact ? 'text-[6px]' : 'text-[7px] sm:text-[8px] md:text-[9px]'
              } ${
                isCurrentTile
                  ? 'z-10 bg-amber-300 font-black text-slate-900 ring-1 ring-amber-600'
                  : isHeadSnake
                  ? 'bg-rose-600/85 font-bold text-white'
                  : isTailSnake
                  ? 'bg-rose-200/80 font-bold text-rose-900'
                  : isLadderStart
                  ? 'bg-emerald-600/85 font-bold text-white'
                  : isLadderEnd
                  ? 'bg-emerald-200/80 font-bold text-emerald-900'
                  : 'bg-white/45 font-semibold text-slate-700'
              }`}
              style={{ left: `${pos.x - 2.2}%`, top: `${pos.y - 2.3}%` }}
            >
              {n}
            </span>
          );
        })}

      {/* Player tokens */}
      <AnimatePresence mode="popLayout">
        {players.map((player) => {
          const stack = tileMap.get(player.position) || [];
          const idx = stack.findIndex((p) => p.id === player.id);
          const isMoving = player.id === movingPlayerId;
          return (
            <PlayerToken
              key={player.id}
              player={player}
              position={player.position}
              allPlayersAtTile={stack.length}
              indexInStack={idx >= 0 ? idx : 0}
              isCurrent={player.id === currentPlayerId}
              isMe={player.id === myPlayerId}
              animateKey={isMoving ? movementKey : 0}
              movementType={isMoving ? movementType : null}
              fromTile={isMoving ? movementFrom : null}
              compact={compact}
            />
          );
        })}
      </AnimatePresence>

      {/* Board corner stamp */}
      <div className="pointer-events-none absolute bottom-2 right-2 hidden rounded-md bg-slate-900/70 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-amber-200 backdrop-blur sm:block">
        {map.name} · Tembakau Digital
      </div>
    </div>
  );
}
