import * as Phaser from 'phaser';
import type { TileId } from '../../shared/level';
import { TILE_PX } from '../../shared/level';
import { RUNNER_H, RUNNER_W } from './constants';

/**
 * Procedural placeholder textures. Everything is drawn with Graphics and baked
 * via generateTexture() — no external assets, no base64 blobs.
 */

export const RUNNER_TEXTURE = 'runner';
export const DUST_TEXTURE = 'fx-dust';
export const SPARK_TEXTURE = 'fx-spark';
export const FLAME_TEXTURE = 'ui-flame';
export const HILLS_FAR_TEXTURE = 'bg-hills-far';
export const HILLS_NEAR_TEXTURE = 'bg-hills-near';

export const tileTexture = (t: TileId): string => `tile-${t}`;

const T = TILE_PX;

const paint = (
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (g: Phaser.GameObjects.Graphics) => void
): void => {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.setVisible(false);
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
};

const paintBlock = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(0x4e5d78, 1);
  g.fillRect(0, 0, T, T);
  // 1px highlight edge (top + left), shadow edge (bottom + right).
  g.fillStyle(0x8095b3, 1);
  g.fillRect(0, 0, T, 1);
  g.fillRect(0, 0, 1, T);
  g.fillStyle(0x36435c, 1);
  g.fillRect(0, T - 1, T, 1);
  g.fillRect(T - 1, 0, 1, T);
};

const paintSpike = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(0xe2554d, 1);
  g.fillTriangle(1, T, T - 1, T, T / 2, 2);
  // Darker right face for a bit of volume.
  g.fillStyle(0xa93b35, 1);
  g.fillTriangle(T / 2, 2, T - 1, T, T / 2, T);
};

const paintSaw = (g: Phaser.GameObjects.Graphics): void => {
  const c = T / 2;
  // Teeth.
  g.fillStyle(0x9aa7b5, 1);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tipX = c + Math.cos(a) * 7.6;
    const tipY = c + Math.sin(a) * 7.6;
    const b1X = c + Math.cos(a - 0.28) * 5.6;
    const b1Y = c + Math.sin(a - 0.28) * 5.6;
    const b2X = c + Math.cos(a + 0.28) * 5.6;
    const b2Y = c + Math.sin(a + 0.28) * 5.6;
    g.fillTriangle(tipX, tipY, b1X, b1Y, b2X, b2Y);
  }
  // Disc + hub.
  g.fillStyle(0xd7dee8, 1);
  g.fillCircle(c, c, 5.8);
  g.fillStyle(0x6b7684, 1);
  g.fillCircle(c, c, 1.9);
};

const paintSpring = (g: Phaser.GameObjects.Graphics): void => {
  // Base plate.
  g.fillStyle(0x5d4a2f, 1);
  g.fillRect(2, T - 2, T - 4, 2);
  // Coils.
  g.fillStyle(0xb9c4cf, 1);
  g.fillRect(4, 11, 8, 1);
  g.fillRect(4, 13, 8, 1);
  // Pad on top.
  g.fillStyle(0xffcf5c, 1);
  g.fillRoundedRect(1, 7, T - 2, 4, 2);
  g.fillStyle(0xffe9a8, 1);
  g.fillRect(3, 8, T - 6, 1);
};

const paintCrumble = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(0x8a6f5c, 1);
  g.fillRect(0, 0, T, T);
  g.fillStyle(0xa98b74, 1);
  g.fillRect(0, 0, T, 1);
  g.fillRect(0, 0, 1, T);
  g.fillStyle(0x5b4635, 1);
  g.fillRect(0, T - 1, T, 1);
  g.fillRect(T - 1, 0, 1, T);
  // Cracks.
  g.lineStyle(1, 0x54402f, 1);
  g.lineBetween(4, 0, 6, 5);
  g.lineBetween(6, 5, 3, 10);
  g.lineBetween(6, 5, 10, 8);
  g.lineBetween(10, 8, 9, 14);
  g.lineBetween(10, 8, 14, 4);
};

const paintSpeed = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(0x0d332f, 1);
  g.fillRect(0, 0, T, T);
  g.lineStyle(1, 0x1d5a52, 1);
  g.strokeRect(0.5, 0.5, T - 1, T - 1);
  // Two chevrons pointing along the run direction.
  g.fillStyle(0x2ee6c8, 1);
  g.fillTriangle(2, 3, 2, 13, 7, 8);
  g.fillTriangle(8, 3, 8, 13, 13, 8);
};

const paintGravity = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(0x2b2150, 1);
  g.fillRect(0, 0, T, T);
  g.lineStyle(1, 0x7c5cff, 1);
  g.strokeRect(0.5, 0.5, T - 1, T - 1);
  g.fillStyle(0xb79cff, 1);
  // Up arrow (left half).
  g.fillTriangle(2, 7, 8, 7, 5, 2);
  g.fillRect(4, 7, 2, 5);
  // Down arrow (right half).
  g.fillTriangle(8, 9, 14, 9, 11, 14);
  g.fillRect(10, 4, 2, 5);
};

const paintCoin = (g: Phaser.GameObjects.Graphics): void => {
  const c = T / 2;
  g.fillStyle(0xb8860b, 1);
  g.fillCircle(c, c, 5.5);
  g.fillStyle(0xffd34d, 1);
  g.fillCircle(c, c, 4.6);
  g.fillStyle(0xfff3b0, 1);
  g.fillCircle(c - 1.6, c - 1.6, 1.6);
};

const paintFlag = (g: Phaser.GameObjects.Graphics): void => {
  // Pole.
  g.fillStyle(0xcfd8dc, 1);
  g.fillRect(3, 0, 2, T);
  g.fillStyle(0xf5f7f8, 1);
  g.fillRect(2, 0, 2, 2);
  // Pennant.
  g.fillStyle(0x4ade80, 1);
  g.fillTriangle(5, 1, 14, 4.5, 5, 8);
};

const paintStart = (g: Phaser.GameObjects.Graphics): void => {
  // Subtle pad at the bottom of the cell.
  g.fillStyle(0x365a46, 1);
  g.fillRoundedRect(1, 10, T - 2, 5, 2);
  g.fillStyle(0x59d98c, 1);
  g.fillRect(2, 10, T - 4, 1);
};

const paintRunner = (g: Phaser.GameObjects.Graphics): void => {
  // Rounded 12x14 body with an eye — readable silhouette, faces right.
  g.fillStyle(0xffa733, 1);
  g.fillRoundedRect(0, 0, RUNNER_W, RUNNER_H, 3);
  g.fillStyle(0xffc266, 1);
  g.fillRoundedRect(2, 8, RUNNER_W - 4, 4, 2);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(8, 5, 2.4);
  g.fillStyle(0x22303c, 1);
  g.fillCircle(9, 5, 1.2);
};

const paintDust = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(4, 4, 4);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 2.4);
};

const paintSpark = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 4, 4);
};

const paintFlame = (g: Phaser.GameObjects.Graphics): void => {
  g.fillStyle(0xff7a2f, 1);
  g.fillTriangle(6, 0, 1, 10, 11, 10);
  g.fillCircle(6, 10, 5);
  g.fillStyle(0xffd166, 1);
  g.fillTriangle(6, 5, 3, 11, 9, 11);
  g.fillCircle(6, 11, 2.8);
};

const paintHills = (
  g: Phaser.GameObjects.Graphics,
  color: number,
  baseY: number,
  height: number,
  bumps: readonly (readonly [number, number])[]
): void => {
  g.fillStyle(color, 1);
  g.fillRect(0, baseY, 256, height - baseY);
  for (const [x, r] of bumps) {
    g.fillCircle(x, baseY, r);
  }
};

export const createGameplayTextures = (scene: Phaser.Scene): void => {
  paint(scene, tileTexture('block'), T, T, paintBlock);
  paint(scene, tileTexture('spike'), T, T, paintSpike);
  paint(scene, tileTexture('saw'), T, T, paintSaw);
  paint(scene, tileTexture('spring'), T, T, paintSpring);
  paint(scene, tileTexture('crumble'), T, T, paintCrumble);
  paint(scene, tileTexture('speed'), T, T, paintSpeed);
  paint(scene, tileTexture('gravity'), T, T, paintGravity);
  paint(scene, tileTexture('coin'), T, T, paintCoin);
  paint(scene, tileTexture('flag'), T, T, paintFlag);
  paint(scene, tileTexture('start'), T, T, paintStart);
  paint(scene, RUNNER_TEXTURE, RUNNER_W, RUNNER_H, paintRunner);
  paint(scene, DUST_TEXTURE, 8, 8, paintDust);
  paint(scene, SPARK_TEXTURE, 4, 4, paintSpark);
  paint(scene, FLAME_TEXTURE, 12, 16, paintFlame);
  // Repeating parallax bands (tile seamlessly at width 256).
  paint(scene, HILLS_FAR_TEXTURE, 256, 120, (g) =>
    paintHills(g, 0x24334f, 70, 120, [
      [0, 38],
      [56, 22],
      [120, 32],
      [196, 24],
      [256, 38],
    ])
  );
  paint(scene, HILLS_NEAR_TEXTURE, 256, 88, (g) =>
    paintHills(g, 0x1a2740, 52, 88, [
      [32, 26],
      [96, 36],
      [168, 22],
      [224, 30],
    ])
  );
};
