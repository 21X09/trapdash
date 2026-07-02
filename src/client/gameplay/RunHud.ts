import * as Phaser from 'phaser';
import { formatMs } from './format';

/**
 * Converts a screen-pixel position into the coordinate a scrollFactor-0 object
 * must use to land there under the current camera zoom (zoom is applied around
 * the viewport center even for scroll-fixed objects).
 */
export const uiPoint = (
  cam: Phaser.Cameras.Scene2D.Camera,
  sx: number,
  sy: number
): { x: number; y: number } => {
  const hw = cam.width * 0.5;
  const hh = cam.height * 0.5;
  return { x: (sx - hw) / cam.zoom + hw, y: (sy - hh) / cam.zoom + hh };
};

const MARGIN = 10;

const style = (size: number): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: 'Arial Black, Arial, sans-serif',
  fontSize: `${size}px`,
  color: '#ffffff',
  stroke: '#0c1220',
  strokeThickness: Math.max(3, Math.round(size / 5)),
});

/**
 * Scroll-fixed HUD: timer top-center, level top-left, deaths top-right,
 * coins under the level label. Scale compensates for camera zoom so text
 * stays readable at mobile sizes.
 */
export class RunHud {
  private readonly scene: Phaser.Scene;
  private readonly timerText: Phaser.GameObjects.Text;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly deathsText: Phaser.GameObjects.Text;
  private readonly coinsText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.timerText = this.makeText(24).setOrigin(0.5, 0);
    this.levelText = this.makeText(15).setOrigin(0, 0);
    this.deathsText = this.makeText(15).setOrigin(1, 0);
    this.coinsText = this.makeText(15).setColor('#ffd34d').setOrigin(0, 0);
    this.layout();
  }

  private makeText(size: number): Phaser.GameObjects.Text {
    return this.scene.add.text(0, 0, '', style(size)).setScrollFactor(0).setDepth(100);
  }

  /** Re-derives positions and inverse-zoom scale. Call on create and resize. */
  layout(): void {
    const cam = this.scene.cameras.main;
    const inv = 1 / cam.zoom;
    const top = uiPoint(cam, cam.width / 2, MARGIN);
    const left = uiPoint(cam, MARGIN, MARGIN);
    const right = uiPoint(cam, cam.width - MARGIN, MARGIN);
    const leftRow2 = uiPoint(cam, MARGIN, MARGIN + 24);
    this.timerText.setPosition(top.x, top.y).setScale(inv);
    this.levelText.setPosition(left.x, left.y).setScale(inv);
    this.deathsText.setPosition(right.x, right.y).setScale(inv);
    this.coinsText.setPosition(leftRow2.x, leftRow2.y).setScale(inv);
  }

  setTimer(ms: number): void {
    this.timerText.setText(formatMs(ms));
  }

  setLevel(index: number, total: number): void {
    this.levelText.setText(`LEVEL ${index + 1}/${total}`);
  }

  setDeaths(count: number): void {
    this.deathsText.setText(`DEATHS ${count}`);
    if (count > 0) this.pop(this.deathsText);
  }

  setCoins(count: number): void {
    this.coinsText.setText(`COINS ${count}`);
    if (count > 0) this.pop(this.coinsText);
  }

  private pop(target: Phaser.GameObjects.Text): void {
    const baseScale = 1 / this.scene.cameras.main.zoom;
    this.scene.tweens.add({
      targets: target,
      scale: { from: baseScale * 1.35, to: baseScale },
      duration: 160,
      ease: 'Quad.easeOut',
    });
  }
}
