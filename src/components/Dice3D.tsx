import { motion, AnimatePresence } from 'framer-motion';
import { diceFaceVariants } from '../utils/animations';

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

function Face({ number, className, isVisible }: { number: number; className: string; isVisible?: boolean }) {
  const pips = PIPS[number];
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          className={`dice-face ${className}`}
          variants={diceFaceVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {Array.from({ length: 9 }, (_, idx) => {
            const row = Math.floor(idx / 3) + 1;
            const col = (idx % 3) + 1;
            const active = pips.some(([r, c]) => r === row && c === col);
            return (
              <motion.div
                key={idx}
                className={`flex items-center justify-center rounded-full ${
                  active ? 'bg-slate-800 shadow-[inset_0_1px_2px_rgba(0,0,0,.5)]' : ''
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: active ? 1 : 0 }}
                transition={{ delay: idx * 0.02, type: 'spring', stiffness: 500, damping: 25 }}
              >
                {active && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.02 + 0.1, type: 'spring', stiffness: 600, damping: 20 }}
                    className="h-2.5 w-2.5 rounded-full bg-white/25"
                  />
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
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

  const cubeVariants = {
    idle: {
      rotateX: finalRot.x,
      rotateY: finalRot.y,
      scale: 1,
    },
    rolling: {
      rotateX: [0, 360, 720, 900 + finalRot.x],
      rotateY: [0, -270, -540, -720 + finalRot.y],
      scale: [1, 1.15, 0.95, 1],
      transition: { duration: 1.45, ease: [0.2, 0.8, 0.25, 1] },
    },
    settle: {
      rotateX: finalRot.x,
      rotateY: finalRot.y,
      scale: [1.05, 1],
      transition: { duration: 0.4, ease: [0.2, 0.8, 0.25, 1] },
    },
  };

  return (
    <div className={`dice-scene ${size === 'lg' ? 'scale-125' : ''}`}>
      <motion.div
        className="dice-cube"
        variants={cubeVariants}
        initial="idle"
        animate={rolling ? 'rolling' : value ? 'settle' : 'idle'}
      >
        <Face number={1} className="dice-face-1" isVisible={value === 1 || rolling} />
        <Face number={2} className="dice-face-2" isVisible={value === 2 || rolling} />
        <Face number={3} className="dice-face-3" isVisible={value === 3 || rolling} />
        <Face number={4} className="dice-face-4" isVisible={value === 4 || rolling} />
        <Face number={5} className="dice-face-5" isVisible={value === 5 || rolling} />
        <Face number={6} className="dice-face-6" isVisible={value === 6 || rolling} />
      </motion.div>
    </div>
  );
}
