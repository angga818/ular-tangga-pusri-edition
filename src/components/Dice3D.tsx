import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

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

/**
 * Orientasi kubus supaya sisi dengan nilai tertentu menghadap pemain.
 * Sudut sisi (lihat index.css):
 *   1 = depan, 2 = kanan, 3 = bawah, 4 = atas, 5 = kiri, 6 = belakang.
 */
const FACE_ROTATIONS: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
};

type DiceSize = 'sm' | 'md' | 'lg';

interface Dice3DProps {
  value: number | null;
  rolling: boolean;
  size?: DiceSize;
  /** Berubah setiap lemparan agar animasi selalu terulang dari awal. */
  rollId?: number | string | null;
}

/**
 * Dadu 3D.
 *
 * PENTING: keenam sisi TETAP dirender (CSS 3D cube) dan TIDAK memakai
 * `motion.*` pada elemen sisinya. Framer Motion menulis `transform` inline,
 * sehingga akan menimpa `rotateY(...) translateZ(...)` dari CSS dan membuat
 * dadu hilang / pipih. Animasi rotasi hanya dijalankan pada elemen kubus
 * (`.dice-cube`) yang tidak punya transform CSS.
 */
export function Dice3D({ value, rolling, size = 'md', rollId = null }: Dice3DProps) {
  const [spin, setSpin] = useState(0);
  const prevRolling = useRef(false);
  const prevRollId = useRef(rollId);
  const restingRef = useRef<{ x: number; y: number }>(FACE_ROTATIONS[1]);

  // Hitung jumlah putaran: naik setiap kali dadu mulai dilempar (atau rollId berubah).
  useEffect(() => {
    const started = rolling && !prevRolling.current;
    const newRollId = prevRollId.current !== rollId;
    if (started || (rolling && newRollId)) {
      setSpin((s) => s + 1);
    }
    prevRolling.current = rolling;
    prevRollId.current = rollId;
  }, [rolling, rollId]);

  const faceValue = value && value >= 1 && value <= 6 ? value : 1;
  const base = FACE_ROTATIONS[faceValue];

  // Target absolut: selalu maju kelipatan 360° supaya tidak pernah "mundur".
  const target = useMemo(
    () => ({ x: base.x + 360 * spin, y: base.y + 360 * spin }),
    [base.x, base.y, spin],
  );

  const animateTarget = useMemo(() => {
    if (!rolling) {
      return { rotateX: target.x, rotateY: target.y, y: 0, scale: 1 };
    }
    const from = restingRef.current;
    // Seluruh keyframe dibangun dari orientasi sebelumnya menuju target dengan
    // delta positif, sehingga kubus tidak pernah berputar mundur walaupun nilai
    // dadu baru punya sudut dasar yang lebih kecil.
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    const at = (start: number, delta: number, p: number) => start + delta * p;
    return {
      rotateX: [
        from.x,
        at(from.x, dx, 0.35),
        at(from.x, dx, 0.7),
        at(from.x, dx, 0.88),
        target.x,
      ],
      rotateY: [
        from.y,
        at(from.y, dy, 0.35),
        at(from.y, dy, 0.7),
        at(from.y, dy, 0.88),
        target.y,
      ],
      y: [0, -16, 0, -6, 0],
      scale: [1, 1.1, 0.94, 1.06, 1],
    };
  }, [rolling, target]);

  // Simpan orientasi "tenang" terakhir untuk dipakai sebagai awal putaran berikutnya.
  useEffect(() => {
    if (!rolling) restingRef.current = target;
  }, [rolling, target]);

  return (
    <div className="dice-stage" data-size={size} data-rolling={rolling ? 'true' : 'false'}>
      <div className="dice-shadow" aria-hidden="true" />
      <div className="dice-scene">
        <motion.div
          className="dice-cube"
          animate={animateTarget}
          transition={
            rolling
              ? {
                  duration: 1.35,
                  ease: [0.22, 0.68, 0.24, 1],
                  times: [0, 0.35, 0.7, 0.88, 1],
                }
              : { type: 'spring', stiffness: 220, damping: 18 }
          }
        >
          {Object.keys(PIPS).map((face) => (
            <Face key={face} number={Number(face)} value={value} rolling={rolling} />
          ))}
        </motion.div>
      </div>
      <div className="dice-glow" aria-hidden="true" />
    </div>
  );
}

function Face({ number, value, rolling }: { number: number; value: number | null; rolling: boolean }) {
  const pips = PIPS[number];
  const activeFace = !rolling && value === number;

  return (
    <div className={`dice-face dice-face-${number}`} aria-hidden={!activeFace}>
      {Array.from({ length: 9 }, (_, idx) => {
        const row = Math.floor(idx / 3) + 1;
        const col = (idx % 3) + 1;
        const active = pips.some(([r, c]) => r === row && c === col);
        return (
          <span key={idx} className="dice-cell">
            {active && (
              <motion.span
                className="dice-pip"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 520,
                  damping: 22,
                  delay: 0.02 * idx,
                }}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}
