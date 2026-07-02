import { Scene } from 'phaser';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    // All gameplay art is generated procedurally in the Preloader —
    // nothing external to load here.
    this.scene.start('Preloader');
  }
}
