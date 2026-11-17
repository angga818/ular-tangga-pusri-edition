import Phaser from 'phaser';
import { useEffect, useRef, useState } from 'react';
import { BOARD_HEIGHT, BOARD_WIDTH, BoardScene, BoardSceneData } from '../phaser/BoardScene';

type PhaserBoardProps = BoardSceneData & { className?: string };

export function PhaserBoard({
  map,
  players,
  currentPlayerId,
  movementTarget,
  myPlayerId,
  status,
  className = '',
}: PhaserBoardProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<BoardScene | null>(null);
  const dataRef = useRef<BoardSceneData>({
    map,
    players,
    currentPlayerId,
    movementTarget,
    myPlayerId,
    status,
  });
  const [ready, setReady] = useState(false);

  dataRef.current = { map, players, currentPlayerId, movementTarget, myPlayerId, status };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    setReady(false);
    const scene = new BoardScene(dataRef.current, (readyScene) => {
      if (disposed) return;
      sceneRef.current = readyScene;
      readyScene.applyData(dataRef.current);
      setReady(true);
    });

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
      backgroundColor: '#0f233d',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: BOARD_WIDTH,
        height: BOARD_HEIGHT,
      },
      render: { antialias: true, pixelArt: false, roundPixels: false },
      audio: { noAudio: true },
      scene: [scene],
    });

    return () => {
      disposed = true;
      sceneRef.current = null;
      game.destroy(true);
    };
  }, [map.id]);

  useEffect(() => {
    sceneRef.current?.applyData({
      map,
      players,
      currentPlayerId,
      movementTarget,
      myPlayerId,
      status,
    });
  }, [map, players, currentPlayerId, movementTarget, myPlayerId, status]);

  return (
    <div
      ref={hostRef}
      className={`relative w-full select-none overflow-hidden rounded-xl border-[3px] border-amber-900/70 bg-[#0f233d] shadow-[0_16px_40px_-12px_rgba(0,0,0,.6)] ${className}`}
      style={{ aspectRatio: `${BOARD_WIDTH} / ${BOARD_HEIGHT}` }}
    >
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/70 text-xs font-bold text-amber-200">
          Menyiapkan papan interaktif…
        </div>
      )}
    </div>
  );
}
