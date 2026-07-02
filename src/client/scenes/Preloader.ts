import { Scene } from 'phaser';
import { createGameplayTextures } from '../gameplay/textures';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init(): void {
    const { width, height } = this.scale;
    // Progress bar outline + fill (all assets are procedural today, so this
    // completes instantly — it is here for when real assets arrive).
    this.add.rectangle(width / 2, height / 2, 260, 20).setStrokeStyle(1, 0xffffff);
    const bar = this.add.rectangle(width / 2 - 128, height / 2, 4, 16, 0x2ee6c8);
    this.load.on('progress', (progress: number) => {
      bar.width = 4 + 252 * progress;
    });
  }

  create(): void {
    // Bake every gameplay texture (tiles, runner, particles, backgrounds).
    createGameplayTextures(this);
    this.scene.start('Hub');
  }
}
