import Phaser from 'phaser';
import { CHARACTERS, getTilePercentPosition } from '../data/mapsAndChars';
import { GameStatus, MapTheme, Player } from '../types/game';
import { BOARD_HEIGHT, BOARD_WIDTH } from './boardDimensions';

export { BOARD_HEIGHT, BOARD_WIDTH } from './boardDimensions';

export interface PhaserMovementTarget {
  player_id: string;
  from_position: number;
  to_position: number;
  movement_type: 'NORMAL' | 'SNAKE' | 'LADDER';
  edge_id?: string;
  key: number;
}

export interface BoardSceneData {
  map: MapTheme;
  players: Player[];
  currentPlayerId: string | null;
  movementTarget: PhaserMovementTarget | null;
  myPlayerId?: string;
  status?: GameStatus;
}

interface TokenView {
  playerId: string;
  player: Player;
  container: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Image;
  silhouette: Phaser.GameObjects.Image;
  sprite: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  idleTween?: Phaser.Tweens.Tween;
  visualTile: number;
}

interface SnakeView {
  from: Phaser.Math.Vector2;
  to: Phaser.Math.Vector2;
  graphics: Phaser.GameObjects.Graphics;
  head: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  phase: number;
}

interface LadderView {
  from: Phaser.Math.Vector2;
  to: Phaser.Math.Vector2;
  graphics: Phaser.GameObjects.Graphics;
  spark: Phaser.GameObjects.Image;
  phase: number;
}

function tilePoint(tile: number): Phaser.Math.Vector2 {
  const p = getTilePercentPosition(tile);
  return new Phaser.Math.Vector2((p.x / 100) * BOARD_WIDTH, (p.y / 100) * BOARD_HEIGHT);
}

function perpendicular(from: Phaser.Math.Vector2, to: Phaser.Math.Vector2): Phaser.Math.Vector2 {
  const dir = new Phaser.Math.Vector2(to.x - from.x, to.y - from.y);
  if (dir.lengthSq() === 0) return new Phaser.Math.Vector2(1, 0);
  dir.normalize();
  return new Phaser.Math.Vector2(-dir.y, dir.x);
}

function curvedPoint(
  from: Phaser.Math.Vector2,
  to: Phaser.Math.Vector2,
  t: number,
  amplitude: number,
  frequency: number,
  phase = 0,
): Phaser.Math.Vector2 {
  const perp = perpendicular(from, to);
  const wave = Math.sin(t * Math.PI * frequency + phase) * amplitude * Math.sin(t * Math.PI);
  return from.clone().lerp(to, t).add(perp.scale(wave));
}

function strokePolyline(graphics: Phaser.GameObjects.Graphics, points: Phaser.Math.Vector2[]): void {
  if (points.length < 2) return;
  graphics.beginPath();
  graphics.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) graphics.lineTo(points[i].x, points[i].y);
  graphics.strokePath();
}

export class BoardScene extends Phaser.Scene {
  private boardData: BoardSceneData;
  private onReady: (scene: BoardScene) => void;

  private tokenLayer?: Phaser.GameObjects.Container;
  private hoverGraphics?: Phaser.GameObjects.Graphics;
  private tooltip?: Phaser.GameObjects.Text;

  private tokens = new Map<string, TokenView>();
  private snakes: SnakeView[] = [];
  private ladders: LadderView[] = [];
  private lastMovementKey = 0;
  private animatingPlayerId: string | null = null;

  constructor(data: BoardSceneData, onReady: (scene: BoardScene) => void) {
    super({ key: 'pusri-board-scene' });
    this.boardData = data;
    this.onReady = onReady;
  }

  preload(): void {
    this.load.image('board-map', this.boardData.map.image_url);
    for (const char of CHARACTERS) {
      this.load.image(`char-${char.id}`, char.image_url);
    }
  }

  create(): void {
    this.createTextures();

    this.add
      .image(0, 0, 'board-map')
      .setOrigin(0, 0)
      .setDisplaySize(BOARD_WIDTH, BOARD_HEIGHT)
      .setDepth(0);

    this.createEdges();
    this.createTileNumbers();
    this.createHoverLayer();
    this.createAmbient();

    this.tokenLayer = this.add.container(0, 0).setDepth(100);
    this.applyData(this.boardData);
    this.onReady(this);
  }

  update(time: number): void {
    for (const snake of this.snakes) this.drawSnake(snake, time);
    for (const ladder of this.ladders) this.drawLadder(ladder, time);
  }

  applyData(next: BoardSceneData): void {
    this.boardData = next;
    if (next.movementTarget && next.movementTarget.key !== this.lastMovementKey) {
      this.lastMovementKey = next.movementTarget.key;
      this.playMovement(next.movementTarget);
    }
    this.syncPlayers(next.players, next.currentPlayerId, next.myPlayerId);
  }

  private createTextures(): void {
    const build = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      if (this.textures.exists(key)) return;
      const g = this.add.graphics();
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };

    build('game-shadow', 80, 30, (g) => {
      for (let i = 5; i >= 1; i--) {
        g.fillStyle(0x020617, 0.06 + (6 - i) * 0.035);
        g.fillEllipse(40, 15, 22 + i * 10, 7 + i * 3);
      }
    });

    build('game-spark', 12, 12, (g) => {
      g.fillStyle(0xffffff, 0.18);
      g.fillCircle(6, 6, 6);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(6, 6, 2.6);
    });

    build('game-glow', 72, 72, (g) => {
      for (let r = 34; r >= 6; r -= 4) {
        g.fillStyle(0xffffff, 0.035 + (34 - r) * 0.003);
        g.fillCircle(36, 36, r);
      }
    });

    build('snake-head-game', 82, 60, (g) => {
      g.fillStyle(0x022c22, 0.35);
      g.fillEllipse(40, 48, 54, 15);

      g.fillStyle(0x04432f, 1);
      g.fillEllipse(36, 30, 58, 42);
      g.fillStyle(0x0f8f66, 1);
      g.fillEllipse(36, 28, 52, 37);
      g.fillStyle(0x34d399, 0.85);
      g.fillEllipse(28, 18, 32, 15);

      g.fillStyle(0x047857, 1);
      g.fillEllipse(51, 35, 30, 21);
      g.fillStyle(0x10b981, 1);
      g.fillEllipse(50, 32, 27, 16);
      g.fillStyle(0x6ee7b7, 0.75);
      g.fillEllipse(43, 26, 16, 6);

      g.fillStyle(0xf8fafc, 1);
      g.fillCircle(40, 21, 9);
      g.fillCircle(55, 24, 8);
      g.fillStyle(0x0f172a, 1);
      g.fillCircle(43, 22, 4.2);
      g.fillCircle(57, 25, 3.8);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(44.5, 20.5, 1.8);
      g.fillCircle(58.2, 23.6, 1.6);

      g.lineStyle(2.5, 0x022c22, 0.9);
      g.beginPath();
      g.moveTo(32, 13);
      g.lineTo(44, 16);
      g.moveTo(49, 16);
      g.lineTo(60, 19);
      g.strokePath();
      g.fillStyle(0x022c22, 0.85);
      g.fillCircle(58, 34, 1.5);
      g.fillCircle(63, 36, 1.3);

      g.lineStyle(2.5, 0xfb7185, 1);
      g.beginPath();
      g.moveTo(64, 38);
      g.lineTo(75, 39);
      g.moveTo(75, 39);
      g.lineTo(80, 35);
      g.moveTo(75, 39);
      g.lineTo(80, 43);
      g.strokePath();
    });
  }

  private createEdges(): void {
    for (const snake of this.boardData.map.snakes) {
      const from = tilePoint(snake.from);
      const to = tilePoint(snake.to);
      const graphics = this.add.graphics().setDepth(22);
      const glow = this.add
        .image(from.x, from.y, 'game-glow')
        .setDisplaySize(76, 76)
        .setTint(0x10b981)
        .setAlpha(0.32)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(21);
      const head = this.add.image(from.x, from.y, 'snake-head-game').setDisplaySize(52, 38).setDepth(24);
      this.snakes.push({
        from,
        to,
        graphics,
        head,
        glow,
        phase: Math.random() * Math.PI * 2,
      });
    }

    for (const ladder of this.boardData.map.ladders) {
      const from = tilePoint(ladder.from);
      const to = tilePoint(ladder.to);
      const graphics = this.add.graphics().setDepth(26);
      const spark = this.add
        .image(from.x, from.y, 'game-spark')
        .setDisplaySize(16, 16)
        .setTint(0xfde68a)
        .setAlpha(0.8)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(28);
      this.ladders.push({
        from,
        to,
        graphics,
        spark,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private drawSnake(snake: SnakeView, time: number): void {
    const phase = time * 0.0017 + snake.phase;
    const points: Phaser.Math.Vector2[] = [];
    const segments = 30;
    for (let i = 0; i <= segments; i++) {
      points.push(curvedPoint(snake.from, snake.to, i / segments, 13, 3.4, phase));
    }

    const g = snake.graphics;
    g.clear();
    g.lineStyle(15, 0x032e20, 0.5);
    strokePolyline(g, points);
    g.lineStyle(10, 0x047857, 0.78);
    strokePolyline(g, points);
    g.lineStyle(4, 0x34d399, 0.62);
    strokePolyline(g, points);

    for (let i = 4; i < points.length - 3; i += 4) {
      g.fillStyle(0xa7f3d0, 0.35 + 0.2 * Math.sin(phase * 2 + i));
      g.fillCircle(points[i].x - 2, points[i].y - 3, 2.4);
    }

    const headPos = curvedPoint(snake.from, snake.to, 0, 0, 0);
    const nextPos = points[1];
    snake.head.setPosition(headPos.x, headPos.y - 2 + Math.sin(phase * 2.4) * 2);
    snake.head.setRotation(Phaser.Math.Angle.Between(headPos.x, headPos.y, nextPos.x, nextPos.y));
    snake.head.setScale((52 / snake.head.width) * (1 + Math.sin(phase * 2.4) * 0.012));

    snake.glow.setPosition(headPos.x, headPos.y);
    snake.glow.setAlpha(0.2 + 0.14 * (1 + Math.sin(phase * 3)));
  }

  private drawLadder(ladder: LadderView, time: number): void {
    const phase = time * 0.0012 + ladder.phase;
    const perp = perpendicular(ladder.from, ladder.to).scale(8);
    const leftBottom = ladder.from.clone().add(perp);
    const rightBottom = ladder.from.clone().subtract(perp);
    const leftTop = ladder.to.clone().add(perp);
    const rightTop = ladder.to.clone().subtract(perp);

    const g = ladder.graphics;
    g.clear();
    g.lineStyle(7, 0x451a03, 0.7);
    strokePolyline(g, [leftBottom, leftTop]);
    strokePolyline(g, [rightBottom, rightTop]);
    g.lineStyle(3.5, 0xfbbf24, 0.9);
    strokePolyline(g, [leftBottom, leftTop]);
    strokePolyline(g, [rightBottom, rightTop]);

    for (let i = 1; i <= 7; i++) {
      const t = i / 8;
      const a = leftBottom.clone().lerp(leftTop, t);
      const b = rightBottom.clone().lerp(rightTop, t);
      const shimmer = 0.65 + 0.3 * Math.sin(phase * 4 - i * 0.7);
      g.lineStyle(4, 0x92400e, 0.85);
      strokePolyline(g, [a, b]);
      g.lineStyle(1.5, 0xfef3c7, shimmer);
      strokePolyline(g, [
        a.clone().add(new Phaser.Math.Vector2(0, -1)),
        b.clone().add(new Phaser.Math.Vector2(0, -1)),
      ]);
    }

    const t = (Math.sin(phase * 1.6) + 1) / 2;
    const sparkPos = ladder.from.clone().lerp(ladder.to, t);
    ladder.spark.setPosition(sparkPos.x, sparkPos.y);
    ladder.spark.setAlpha(0.35 + 0.5 * Math.sin(t * Math.PI));
    ladder.spark.setScale(0.9 + 0.35 * Math.sin(phase * 5));
  }

  private createTileNumbers(): void {
    const layer = this.add.container(0, 0).setDepth(40);
    for (let n = 1; n <= 100; n++) {
      const p = tilePoint(n);
      const isSnakeHead = this.boardData.map.snakes.some((s) => s.from === n);
      const isSnakeTail = this.boardData.map.snakes.some((s) => s.to === n);
      const isLadderStart = this.boardData.map.ladders.some((l) => l.from === n);
      const isLadderEnd = this.boardData.map.ladders.some((l) => l.to === n);

      let bg = '#ffffff88';
      let color = '#334155';
      if (isSnakeHead) {
        bg = '#be123c';
        color = '#ffffff';
      } else if (isSnakeTail) {
        bg = '#ffe4e6';
        color = '#9f1239';
      } else if (isLadderStart) {
        bg = '#047857';
        color = '#ffffff';
      } else if (isLadderEnd) {
        bg = '#d1fae5';
        color = '#065f46';
      }

      const text = this.add
        .text(p.x, p.y, String(n), {
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fontSize: '11px',
          fontStyle: 'bold',
          color,
          backgroundColor: bg,
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5, 0.5);
      layer.add(text);
    }
  }

  private createHoverLayer(): void {
    this.hoverGraphics = this.add.graphics().setDepth(5000);
    this.tooltip = this.add
      .text(0, 0, '', {
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#0f172a',
        backgroundColor: '#fffdf7ee',
        padding: { x: 8, y: 5 },
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setDepth(5100)
      .setVisible(false);

    for (let n = 1; n <= 100; n++) {
      const p = tilePoint(n);
      const zone = this.add
        .zone(p.x, p.y, 48, 36)
        .setInteractive({ useHandCursor: true })
        .setDepth(4900);
      zone.on('pointerover', () => this.showTileInfo(n));
      zone.on('pointerdown', () => this.showTileInfo(n));
      zone.on('pointerout', () => this.hideTileInfo());
    }
  }

  private showTileInfo(tile: number): void {
    if (!this.hoverGraphics || !this.tooltip) return;
    const p = tilePoint(tile);
    const notes: string[] = [];
    const snake = this.boardData.map.snakes.find((s) => s.from === tile);
    const snakeTail = this.boardData.map.snakes.find((s) => s.to === tile);
    const ladder = this.boardData.map.ladders.find((l) => l.from === tile);
    const ladderEnd = this.boardData.map.ladders.find((l) => l.to === tile);
    if (snake) notes.push(`🐍 ${snake.label || `Turun ke ${snake.to}`}`);
    if (snakeTail) notes.push(`Ular dari ${snakeTail.from}`);
    if (ladder) notes.push(`🪜 ${ladder.label || `Naik ke ${ladder.to}`}`);
    if (ladderEnd) notes.push(`Tangga dari ${ladderEnd.from}`);

    this.hoverGraphics.clear();
    this.hoverGraphics.fillStyle(0xfbbf24, 0.16);
    this.hoverGraphics.fillEllipse(p.x, p.y, 58, 40);
    this.hoverGraphics.lineStyle(3, 0xfbbf24, 0.95);
    this.hoverGraphics.strokeEllipse(p.x, p.y, 58, 40);

    this.tooltip.setText(`Kotak ${tile}${notes.length ? `\n${notes.join('\n')}` : ''}`);
    this.tooltip.setPosition(Phaser.Math.Clamp(p.x, 130, BOARD_WIDTH - 130), Math.max(70, p.y - 26));
    this.tooltip.setVisible(true);
  }

  private hideTileInfo(): void {
    this.hoverGraphics?.clear();
    this.tooltip?.setVisible(false);
  }

  private createAmbient(): void {
    for (let i = 0; i < 22; i++) {
      const dust = this.add
        .image(Phaser.Math.Between(0, BOARD_WIDTH), Phaser.Math.Between(0, BOARD_HEIGHT), 'game-spark')
        .setTint(i % 3 === 0 ? 0xfbbf24 : 0xffffff)
        .setAlpha(Phaser.Math.FloatBetween(0.08, 0.28))
        .setScale(Phaser.Math.FloatBetween(0.35, 0.9))
        .setDepth(70)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: dust,
        y: dust.y - Phaser.Math.Between(60, 150),
        x: dust.x + Phaser.Math.Between(-24, 24),
        alpha: 0,
        duration: Phaser.Math.Between(3600, 7200),
        repeat: -1,
        ease: 'Sine.easeInOut',
        onRepeat: () => {
          dust.setPosition(Phaser.Math.Between(0, BOARD_WIDTH), BOARD_HEIGHT + 12);
          dust.setAlpha(Phaser.Math.FloatBetween(0.08, 0.28));
        },
      });
    }

    this.add
      .text(BOARD_WIDTH - 22, BOARD_HEIGHT - 18, `${this.boardData.map.name} · Tembakau Digital`, {
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fde68a',
        backgroundColor: '#0f172a99',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 1)
      .setDepth(6000);
  }

  private createToken(player: Player, index: number): TokenView {
    const char = CHARACTERS.find((c) => c.id === player.character_id) || CHARACTERS[0];
    const textureKey = `char-${char.id}`;
    const sprite = this.add.image(0, 0, textureKey).setOrigin(0.5, 1);
    const scale = 66 / sprite.height;
    sprite.setScale(scale);

    const silhouette = this.add
      .image(2, 3, textureKey)
      .setOrigin(0.5, 1)
      .setScale(scale * 1.035)
      .setTint(0x020617)
      .setAlpha(0.32);

    const shadow = this.add.image(0, 1, 'game-shadow').setDisplaySize(52, 20).setAlpha(0.75);
    const ring = this.add.graphics();
    const label = this.add
      .text(0, -76, player.nickname.length > 10 ? `${player.nickname.slice(0, 9)}…` : player.nickname, {
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#0f172a',
        backgroundColor: '#fffdf7ee',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1);

    const container = this.add.container(0, 0, [ring, shadow, silhouette, sprite, label]);
    const token: TokenView = {
      playerId: player.id,
      player,
      container,
      shadow,
      silhouette,
      sprite,
      ring,
      label,
      visualTile: player.position,
    };

    const p = tilePoint(player.position);
    container.setPosition(p.x, p.y);
    this.tokenLayer?.add(container);

    token.idleTween = this.tweens.add({
      targets: sprite,
      y: -3,
      duration: 900 + (index % 5) * 110,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return token;
  }

  private styleToken(token: TokenView, currentPlayerId: string | null, myPlayerId?: string): void {
    const isCurrent = token.playerId === currentPlayerId;
    const isMe = token.playerId === myPlayerId;
    token.ring.clear();
    token.ring.lineStyle(
      isCurrent ? 3.5 : 2,
      isCurrent ? 0xfbbf24 : isMe ? 0x38bdf8 : 0xffffff,
      isCurrent ? 0.95 : 0.7,
    );
    token.ring.strokeEllipse(0, 2, isCurrent ? 52 : 46, isCurrent ? 22 : 19);
    if (isCurrent) {
      token.ring.fillStyle(0xfbbf24, 0.12);
      token.ring.fillEllipse(0, 2, 58, 26);
    }
    token.sprite.setTint(isCurrent ? 0xfff3d6 : 0xffffff);
    token.label.setBackgroundColor(isCurrent ? '#fde68a' : '#fffdf7ee');
    token.shadow.setAlpha(isCurrent ? 0.9 : 0.7);
  }

  private syncPlayers(players: Player[], currentPlayerId: string | null, myPlayerId?: string): void {
    const liveIds = new Set(players.map((p) => p.id));
    for (const [id, token] of this.tokens) {
      if (liveIds.has(id)) continue;
      token.idleTween?.stop();
      this.tweens.killTweensOf(token.container);
      this.tweens.killTweensOf(token.sprite);
      token.container.destroy();
      this.tokens.delete(id);
    }

    players.forEach((player, index) => {
      let token = this.tokens.get(player.id);
      if (!token) {
        token = this.createToken(player, index);
        this.tokens.set(player.id, token);
      }
      token.player = player;
      token.label.setText(player.nickname.length > 10 ? `${player.nickname.slice(0, 9)}…` : player.nickname);
      this.styleToken(token, currentPlayerId, myPlayerId);

      if (this.animatingPlayerId !== player.id && token.visualTile !== player.position) {
        token.visualTile = player.position;
        const p = tilePoint(player.position);
        token.container.setPosition(p.x, p.y);
      }
      token.container.setDepth(1000 + tilePoint(token.visualTile).y);
    });
  }

  private playMovement(target: PhaserMovementTarget): void {
    const token = this.tokens.get(target.player_id);
    if (!token) return;

    this.animatingPlayerId = target.player_id;
    token.idleTween?.stop();
    this.tweens.killTweensOf(token.container);
    this.tweens.killTweensOf(token.sprite);
    token.sprite.setPosition(0, 0).setRotation(0);
    token.silhouette.setPosition(2, 3);

    const from = tilePoint(target.from_position);
    token.container.setPosition(from.x, from.y);
    token.visualTile = target.from_position;

    const finish = () => {
      if (this.lastMovementKey !== target.key) return;
      token.visualTile = target.to_position;
      token.sprite.setPosition(0, 0).setRotation(0);
      token.silhouette.setPosition(2, 3);
      this.animatingPlayerId = null;
      this.restartIdle(token);
      const dest = tilePoint(target.to_position);
      const color =
        target.movement_type === 'SNAKE' ? 0xfb7185 : target.movement_type === 'LADDER' ? 0x34d399 : 0xfbbf24;
      this.burstAt(dest.x, dest.y - 34, color);
    };

    if (target.movement_type === 'NORMAL') {
      this.animateSteps(token, target.from_position, target.to_position, finish);
    } else if (target.movement_type === 'SNAKE') {
      this.animateSnakeRide(token, target, finish);
    } else {
      this.animateLadderClimb(token, target, finish);
    }

    if (target.edge_id) this.flashEdge(target.edge_id, target.movement_type);
  }

  private restartIdle(token: TokenView): void {
    token.idleTween?.stop();
    token.idleTween = this.tweens.add({
      targets: token.sprite,
      y: -3,
      duration: 950,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private animateSteps(token: TokenView, fromTile: number, toTile: number, finish: () => void): void {
    if (fromTile === toTile) {
      finish();
      return;
    }
    const step = toTile > fromTile ? 1 : -1;
    let current = fromTile;

    const next = () => {
      if (this.animatingPlayerId !== token.playerId) return;
      current += step;
      const p = tilePoint(current);
      const done = current === toTile;
      this.tweens.add({
        targets: token.container,
        x: p.x,
        y: p.y,
        duration: 175,
        ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: token.sprite,
        y: -12,
        duration: 88,
        yoyo: true,
        ease: 'Sine.easeOut',
      });
      if (done) this.time.delayedCall(180, finish);
      else this.time.delayedCall(175, next);
    };
    next();
  }

  private animateSnakeRide(token: TokenView, target: PhaserMovementTarget, finish: () => void): void {
    const edge = this.boardData.map.snakes.find((s) => s.id === target.edge_id);
    const from = tilePoint(edge?.from ?? target.from_position);
    const to = tilePoint(edge?.to ?? target.to_position);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1450,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const t = Number(tween.getValue());
        const p = curvedPoint(from, to, t, 12, 3.4);
        token.container.setPosition(p.x, p.y);
        token.sprite.y = -Math.sin(t * Math.PI) * 7;
        token.sprite.rotation = Math.sin(t * Math.PI * 5) * 0.13;
      },
      onComplete: finish,
    });
  }

  private animateLadderClimb(token: TokenView, target: PhaserMovementTarget, finish: () => void): void {
    const edge = this.boardData.map.ladders.find((l) => l.id === target.edge_id);
    const from = tilePoint(edge?.from ?? target.from_position);
    const to = tilePoint(edge?.to ?? target.to_position);
    const perp = perpendicular(from, to);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1300,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const t = Number(tween.getValue());
        const p = from.clone().lerp(to, t).add(perp.clone().scale(Math.sin(t * Math.PI * 6) * 3));
        token.container.setPosition(p.x, p.y);
        token.sprite.y = -Math.abs(Math.sin(t * Math.PI * 7)) * 8;
        token.sprite.rotation = Math.sin(t * Math.PI * 7) * 0.05;
      },
      onComplete: finish,
    });
  }

  private flashEdge(edgeId: string, type: 'NORMAL' | 'SNAKE' | 'LADDER'): void {
    const edge = this.boardData.map.snakes.find((s) => s.id === edgeId) ||
      this.boardData.map.ladders.find((l) => l.id === edgeId);
    if (!edge) return;

    const from = tilePoint(edge.from);
    const to = tilePoint(edge.to);
    const color = type === 'SNAKE' ? 0xfb7185 : 0x6ee7b7;
    const fx = this.add.graphics().setDepth(3500).setBlendMode(Phaser.BlendModes.ADD);
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      points.push(type === 'SNAKE' ? curvedPoint(from, to, t, 13, 3.4) : from.clone().lerp(to, t));
    }
    fx.lineStyle(18, color, 0.85);
    strokePolyline(fx, points);
    this.tweens.add({
      targets: fx,
      alpha: 0,
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => fx.destroy(),
    });
    this.cameras.main.shake(160, 0.0028);
  }

  private burstAt(x: number, y: number, color: number): void {
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
      const distance = Phaser.Math.Between(24, 68);
      const spark = this.add
        .image(x, y, 'game-spark')
        .setTint(color)
        .setDepth(4000)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(Phaser.Math.FloatBetween(0.7, 1.6));
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance - 12,
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(420, 760),
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }
}
