import { motion } from 'framer-motion';

const PIPS: Record<number, Array<[number, number]>> = {
  1: [[2, 2]],
  2: [
    [1, 1],
    [3, 3],
  ],
  3: [
    [1, 1],
    [2, 2],
    [3, 3],
  ],
  4: [
    [1, 1],
    [1, 3],
    [3, 1],
    [3, 3],
  ],
  5: [
    [1, 1],
    [1, 3],
    [2, 2],
    [3, 1],
    [3, 3],
  ],
  6: [
    [1, 1],
    [1, 2],
    [1, 3],
    [3, 1],
    [3, 2],
    [3, 3],
  ],
};

function Face({ number, className }: { number: number; className: string }) {
  const pips = PIPS[number];
  return (
    <div className={`dice-face ${className}`}>
      {Array.from({ length: 9 }, (_, idx) => {
        const row = Math.floor(idx / 3) + 1;
        const col = (idx % 3) + 1;
        const active = pips.some(([r, c]) => r === row && c === col);
        return (
          <div
            key={idx}
            className={`flex items-center justify-center rounded-full ${
              active ? 'bg-slate-800 shadow-[inset_0_1px_2px_rgba(0,0,0,.5)]' : ''
            }`}
          >
            {active && <span className="h-2.5 w-2.5 rounded-full bg-white/25" />}
          </div>
        );
      })}
    </div>
  );
}

export function Dice3D({
  value,
  rolling,
  size = 'md',
}: {
  value: number | null;
  rolling: boolean;
  size?: 'md' | 'lg';
}) {
  const rotations: Record<number, { x: number; y: number }> = {
    1: { x: 0, y: 0 },
    2: { x: 0, y: -90 },
    3: { x: -90, y: 0 },
    4: { x: 90, y: 0 },
    5: { x: 0, y: 90 },
    6: { x: 0, y: -180 },
  };
  const finalRot = value ? rotations[value] : rotations[1];

  return (
    <div className={`dice-scene ${size === 'lg' ? 'scale-125' : ''}`}>
      <motion.div
        className="dice-cube"
        animate={
          rolling
            ? {
                rotateX: [0, 360, 720, 900 + finalRot.x],
                rotateY: [0, -270, -540, -720 + finalRot.y],
                scale: [1, 1.15, 0.95, 1],
              }
            : {
                rotateX: finalRot.x,
                rotateY: finalRot.y,
                scale: 1,
              }
        }
        transition={
          rolling
            ? { duration: 1.45, ease: [0.2, 0.8, 0.25, 1] }
            : { duration: 0.5, ease: 'easeOut' }
        }
      >
        <Face number={1} className="dice-face-1" />
        <Face number={2} className="dice-face-2" />
        <Face number={3} className="dice-face-3" />
        <Face number={4} className="dice-face-4" />
        <Face number={5} className="dice-face-5" />
        <Face number={6} className="dice-face-6" />
      </motion.div>
    </div>
  );
}
