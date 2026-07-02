import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { COIN_BONUS_MS } from '../gameplay/constants';
import { formatMs } from '../gameplay/format';
import { TEST_LEVELS } from '../gameplay/testLevels';
import type { RunConfig, RunResults } from '../gameplay/types';
import { makeTextButton, UI_FONT } from '../gameplay/ui';

export class Results extends Scene {
  private results: RunResults = { splits: [], deaths: 0, coins: 0, totalMs: 0 };
  private header: Phaser.GameObjects.Text | null = null;
  private totalText: Phaser.GameObjects.Text | null = null;
  private detailText: Phaser.GameObjects.Text | null = null;
  private retryButton: Phaser.GameObjects.Container | null = null;
  private homeButton: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Results');
  }

  init(data: Partial<RunResults>): void {
    this.results = {
      splits: data.splits ?? [],
      deaths: data.deaths ?? 0,
      coins: data.coins ?? 0,
      totalMs: data.totalMs ?? 0,
    };
    this.header = null;
    this.totalText = null;
    this.detailText = null;
    this.retryButton = null;
    this.homeButton = null;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0f1626);
    const { splits, deaths, coins, totalMs } = this.results;

    this.header = this.add
      .text(0, 0, 'RUN COMPLETE', {
        fontFamily: UI_FONT,
        fontSize: '26px',
        color: '#8fa3b8',
      })
      .setOrigin(0.5);

    this.totalText = this.add
      .text(0, 0, formatMs(totalMs), {
        fontFamily: UI_FONT,
        fontSize: '72px',
        color: '#2ee6c8',
        stroke: '#0c1220',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: this.totalText,
      scale: { from: 1.5, to: 1 },
      alpha: { from: 0, to: 1 },
      duration: 350,
      ease: 'Back.easeOut',
    });

    const lines = splits.map((ms, i) => `LEVEL ${i + 1}   ${formatMs(ms)}`);
    lines.push('');
    lines.push(`DEATHS   ${deaths}`);
    lines.push(`COINS   ${coins}   (−${formatMs(coins * COIN_BONUS_MS)})`);
    this.detailText = this.add
      .text(0, 0, lines.join('\n'), {
        fontFamily: UI_FONT,
        fontSize: '20px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5, 0);

    this.retryButton = makeTextButton(
      this,
      0,
      0,
      'RETRY',
      () => {
        const config: RunConfig = { levels: TEST_LEVELS };
        this.scene.start('Run', config);
      },
      { width: 240, height: 68, fontSize: 28 }
    );
    this.homeButton = makeTextButton(this, 0, 0, 'HOME', () => this.scene.start('Hub'), {
      width: 240,
      height: 56,
      fontSize: 22,
      fill: 0x4e5d78,
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
    const scaleFactor = Math.min(Math.min(width / 640, height / 760), 1);

    this.header?.setPosition(cx, height * 0.1).setScale(scaleFactor);
    this.totalText?.setPosition(cx, height * 0.2);
    this.detailText?.setPosition(cx, height * 0.3).setScale(scaleFactor);
    this.retryButton?.setPosition(cx, height * 0.72).setScale(scaleFactor);
    this.homeButton?.setPosition(cx, height * 0.85).setScale(scaleFactor);
  }
}
