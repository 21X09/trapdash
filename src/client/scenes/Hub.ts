import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { TEST_LEVELS } from '../gameplay/testLevels';
import { FLAME_TEXTURE, HILLS_FAR_TEXTURE, HILLS_NEAR_TEXTURE } from '../gameplay/textures';
import type { RunConfig } from '../gameplay/types';
import { makeTextButton, UI_FONT } from '../gameplay/ui';

export class Hub extends Scene {
  private title: Phaser.GameObjects.Text | null = null;
  private subtitle: Phaser.GameObjects.Text | null = null;
  private playButton: Phaser.GameObjects.Container | null = null;
  private buildButton: Phaser.GameObjects.Container | null = null;
  private voteButton: Phaser.GameObjects.Container | null = null;
  private streak: Phaser.GameObjects.Container | null = null;
  private hillsFar: Phaser.GameObjects.TileSprite | null = null;
  private hillsNear: Phaser.GameObjects.TileSprite | null = null;

  constructor() {
    super('Hub');
  }

  init(): void {
    this.title = null;
    this.subtitle = null;
    this.playButton = null;
    this.buildButton = null;
    this.voteButton = null;
    this.streak = null;
    this.hillsFar = null;
    this.hillsNear = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0f1626);

    this.hillsFar = this.add.tileSprite(0, 0, 32, 240, HILLS_FAR_TEXTURE).setOrigin(0, 1);
    this.hillsNear = this.add.tileSprite(0, 0, 32, 176, HILLS_NEAR_TEXTURE).setOrigin(0, 1);

    this.title = this.add
      .text(0, 0, 'TRAPDASH', {
        fontFamily: UI_FONT,
        fontSize: '64px',
        color: '#ffffff',
        stroke: '#2ee6c8',
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: this.title,
      scale: { from: 1, to: 1.045 },
      angle: { from: -0.6, to: 0.6 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.subtitle = this.add
      .text(0, 0, 'Run the gauntlet. Build the traps.', {
        fontFamily: UI_FONT,
        fontSize: '18px',
        color: '#8fa3b8',
      })
      .setOrigin(0.5);

    const startRun = (): void => {
      const config: RunConfig = { levels: TEST_LEVELS };
      this.scene.start('Run', config);
    };
    this.playButton = makeTextButton(this, 0, 0, 'PLAY', startRun, {
      width: 280,
      height: 76,
      fontSize: 32,
    });
    this.buildButton = makeTextButton(this, 0, 0, 'BUILD', () => undefined, {
      width: 280,
      height: 58,
      fontSize: 22,
      fill: 0x4e5d78,
      disabledBadge: 'SOON',
    });
    this.voteButton = makeTextButton(this, 0, 0, 'VOTE', () => undefined, {
      width: 280,
      height: 58,
      fontSize: 22,
      fill: 0x4e5d78,
      disabledBadge: 'SOON',
    });

    // Streak flame placeholder.
    const flame = this.add.image(0, 0, FLAME_TEXTURE).setScale(2);
    const streakText = this.add
      .text(18, 0, 'STREAK 0', {
        fontFamily: UI_FONT,
        fontSize: '16px',
        color: '#ffd166',
      })
      .setOrigin(0, 0.5);
    this.streak = this.add.container(0, 0, [flame, streakText]);
    this.tweens.add({
      targets: flame,
      scaleY: { from: 2, to: 2.25 },
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.layout();
    const onResize = (gameSize: Phaser.Structs.Size): void => {
      this.cameras.resize(gameSize.width, gameSize.height);
      this.layout();
    };
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', onResize);
    });
  }

  private layout(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const scaleFactor = Math.min(Math.min(width / 640, height / 640), 1);

    this.hillsFar?.setPosition(0, height).setSize(width, 240);
    this.hillsNear?.setPosition(0, height).setSize(width, 176);

    this.title?.setPosition(cx, height * 0.2);
    this.subtitle?.setPosition(cx, height * 0.2 + 52 * scaleFactor);
    this.subtitle?.setScale(scaleFactor);
    this.playButton?.setPosition(cx, height * 0.46);
    this.buildButton?.setPosition(cx, height * 0.61);
    this.voteButton?.setPosition(cx, height * 0.73);
    this.playButton?.setScale(scaleFactor);
    this.buildButton?.setScale(scaleFactor);
    this.voteButton?.setScale(scaleFactor);
    this.streak?.setPosition(cx - 52 * scaleFactor, height * 0.86);
    this.streak?.setScale(scaleFactor);
  }
}
