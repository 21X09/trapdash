import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { Boot } from './scenes/Boot';
import { Hub } from './scenes/Hub';
import { Preloader } from './scenes/Preloader';
import { Results } from './scenes/Results';
import { Run } from './scenes/Run';

//  Scene flow: Boot → Preloader → Hub → Run → Results.
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#0f1626',
  scale: {
    // Fill the web-view; each scene lays itself out on resize, and the Run
    // scene re-derives its camera zoom from the viewport height.
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1024,
    height: 768,
  },
  physics: {
    default: 'arcade',
    arcade: {
      // Gravity is applied per-body so gravity pads can flip it for the runner.
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [Boot, Preloader, Hub, Run, Results],
};

const StartGame = (parent: string) => {
  return new Game({ ...config, parent });
};

document.addEventListener('DOMContentLoaded', () => {
  StartGame('game-container');
});
