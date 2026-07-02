import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { Level } from '../../shared/level';
import {
  CAMERA_LOOKAHEAD,
  CLEAR_BEAT_MS,
  COIN_BONUS_MS,
  DEATH_MARGIN,
  GRAVITY_PAD_COOLDOWN_MS,
  RESPAWN_DELAY_MS,
  SPEED_PAD_MS,
  SPRING_COOLDOWN_MS,
  WORLD_H,
  WORLD_W,
} from '../gameplay/constants';
import { LevelRuntime } from '../gameplay/LevelRuntime';
import type { PadEntry } from '../gameplay/LevelRuntime';
import { Runner } from '../gameplay/Runner';
import { RunHud, uiPoint } from '../gameplay/RunHud';
import { TEST_LEVELS } from '../gameplay/testLevels';
import {
  DUST_TEXTURE,
  HILLS_FAR_TEXTURE,
  HILLS_NEAR_TEXTURE,
  SPARK_TEXTURE,
} from '../gameplay/textures';
import type { RunConfig, RunResults } from '../gameplay/types';
import { UI_FONT } from '../gameplay/ui';

type RunState = 'running' | 'dead' | 'clear';

export class Run extends Scene {
  private levels: Level[] = [];
  private levelIndex = 0;
  private runtime: LevelRuntime | null = null;
  private runner: Runner | null = null;
  private hud: RunHud | null = null;
  private state: RunState = 'running';

  private levelElapsed = 0;
  private splits: number[] = [];
  private deaths = 0;
  private coins = 0;
  private coinsAtRespawn = 0;

  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private dustEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private deathEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private banner: Phaser.GameObjects.Text | null = null;
  private juiceTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super('Run');
  }

  init(data: Partial<RunConfig>): void {
    this.levels = data.levels && data.levels.length > 0 ? data.levels : TEST_LEVELS;
    this.levelIndex = 0;
    this.runtime = null;
    this.runner = null;
    this.hud = null;
    this.state = 'running';
    this.levelElapsed = 0;
    this.splits = [];
    this.deaths = 0;
    this.coins = 0;
    this.coinsAtRespawn = 0;
    this.colliders = [];
    this.dustEmitter = null;
    this.deathEmitter = null;
    this.trailEmitter = null;
    this.banner = null;
    this.juiceTween = null;
  }

  create(): void {
    const cam = this.cameras.main;
    cam.setBackgroundColor(0x0f1626);
    cam.setBounds(0, 0, WORLD_W, WORLD_H);

    this.createBackground();

    const firstLevel = this.levelAt(this.levelIndex);
    this.runtime = new LevelRuntime(this, firstLevel);
    this.runner = new Runner(this, this.runtime.spawnX, this.runtime.spawnY, {
      onJump: () => this.onRunnerJump(),
      onLand: () => this.onRunnerLand(),
    });
    this.createEmitters(this.runner);
    this.wireColliders(this.runner, this.runtime);

    cam.startFollow(this.runner.sprite, false, 0.15, 1, -CAMERA_LOOKAHEAD, 0);

    this.hud = new RunHud(this);
    this.hud.setLevel(this.levelIndex, this.levels.length);
    this.hud.setDeaths(0);
    this.hud.setCoins(0);
    this.hud.setTimer(0);

    this.banner = this.add
      .text(0, 0, '', {
        fontFamily: UI_FONT,
        fontSize: '34px',
        color: '#ffffff',
        stroke: '#0c1220',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101)
      .setAlpha(0);

    this.wireInput();
    this.applyZoom();

    const onResize = (gameSize: Phaser.Structs.Size): void => {
      this.cameras.resize(gameSize.width, gameSize.height);
      this.applyZoom();
    };
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', onResize);
    });

    this.showBanner(firstLevel.name, '#ffffff');
    cam.fadeIn(250, 15, 22, 38);
  }

  override update(time: number, delta: number): void {
    if (!this.runner || !this.hud) return;

    // The clock keeps running through deaths; it only pauses on the clear beat.
    if (this.state === 'running' || this.state === 'dead') {
      this.levelElapsed += delta;
      this.hud.setTimer(this.completedMs() + this.levelElapsed);
    }

    if (this.state !== 'running') return;

    this.runner.update(time);

    // Speed-boost trail expiry.
    if (this.trailEmitter && this.trailEmitter.emitting && time >= this.runner.speedBoostUntil) {
      this.trailEmitter.stop();
    }

    // Death by leaving the vertical world bounds (either direction).
    const y = this.runner.sprite.y;
    if (y < -DEATH_MARGIN || y > WORLD_H + DEATH_MARGIN) {
      this.kill();
    }
  }

  // -------------------------------------------------- setup helpers

  private createBackground(): void {
    // Soft glow "sun" far back, then two parallax hill bands.
    this.add.circle(140, 64, 26, 0xfff3b0, 0.16).setScrollFactor(0.1, 1).setDepth(-4);
    this.add.circle(140, 64, 14, 0xfff3b0, 0.3).setScrollFactor(0.1, 1).setDepth(-4);
    this.add
      .tileSprite(0, WORLD_H, WORLD_W, 120, HILLS_FAR_TEXTURE)
      .setOrigin(0, 1)
      .setScrollFactor(0.25, 1)
      .setDepth(-3);
    this.add
      .tileSprite(0, WORLD_H, WORLD_W, 88, HILLS_NEAR_TEXTURE)
      .setOrigin(0, 1)
      .setScrollFactor(0.5, 1)
      .setDepth(-2);
  }

  private createEmitters(runner: Runner): void {
    this.dustEmitter = this.add.particles(0, 0, DUST_TEXTURE, {
      speed: { min: 10, max: 50 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 200, max: 380 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.9, end: 0 },
      emitting: false,
    });
    this.dustEmitter.setDepth(6);

    this.deathEmitter = this.add.particles(0, 0, SPARK_TEXTURE, {
      speed: { min: 60, max: 190 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 350, max: 550 },
      scale: { start: 1.4, end: 0 },
      gravityY: 350,
      tint: [0xff5a5a, 0xffd166, 0xffffff],
      emitting: false,
    });
    this.deathEmitter.setDepth(7);

    this.trailEmitter = this.add.particles(0, 0, SPARK_TEXTURE, {
      follow: runner.sprite,
      speed: { min: 5, max: 25 },
      angle: { min: 150, max: 210 },
      frequency: 22,
      lifespan: 240,
      scale: { start: 0.9, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: 0x2ee6c8,
      emitting: false,
    });
    this.trailEmitter.setDepth(4);
  }

  private wireInput(): void {
    this.input.on('pointerdown', () => this.handlePress());
    this.input.on('pointerup', () => this.handleRelease());
    const keyboard = this.input.keyboard;
    if (keyboard) {
      const press = (event: KeyboardEvent): void => {
        if (!event.repeat) this.handlePress();
      };
      keyboard.on('keydown-SPACE', press);
      keyboard.on('keydown-UP', press);
      keyboard.on('keyup-SPACE', () => this.handleRelease());
      keyboard.on('keyup-UP', () => this.handleRelease());
    }
  }

  private wireColliders(runner: Runner, runtime: LevelRuntime): void {
    this.colliders.push(
      this.physics.add.collider(runner.sprite, runtime.solids, (a, b) => {
        const entry = runtime.crumbleByObject.get(a) ?? runtime.crumbleByObject.get(b);
        if (entry && this.state === 'running') runtime.triggerCrumble(entry);
      }),
      this.physics.add.overlap(runner.sprite, runtime.hazards, () => {
        this.kill();
      }),
      this.physics.add.overlap(runner.sprite, runtime.pads, (a, b) => {
        const entry = runtime.padByObject.get(a) ?? runtime.padByObject.get(b);
        if (entry) this.handlePad(entry);
      }),
      this.physics.add.overlap(runner.sprite, runtime.coins, (a, b) => {
        const entry = runtime.coinByObject.get(a) ?? runtime.coinByObject.get(b);
        if (entry && !entry.collected && this.state === 'running') {
          runtime.collectCoin(entry);
          this.coins += 1;
          this.hud?.setCoins(this.coins);
        }
      })
    );
    if (runtime.flag) {
      this.colliders.push(
        this.physics.add.overlap(runner.sprite, runtime.flag, () => {
          this.clearLevel();
        })
      );
    }
  }

  private applyZoom(): void {
    // The 224px-tall world always fills the viewport height.
    const zoom = this.scale.height / WORLD_H;
    this.cameras.main.setZoom(zoom);
    this.hud?.layout();
  }

  // -------------------------------------------------- gameplay events

  private handlePress(): void {
    if (this.state === 'running') this.runner?.pressJump(this.time.now);
  }

  private handleRelease(): void {
    if (this.state === 'running') this.runner?.releaseJump();
  }

  private handlePad(pad: PadEntry): void {
    if (!this.runner || this.state !== 'running') return;
    const now = this.time.now;
    switch (pad.kind) {
      case 'spring': {
        if (now - pad.lastTriggeredAt < SPRING_COOLDOWN_MS) return;
        pad.lastTriggeredAt = now;
        this.runner.springBounce();
        this.stretchRunner();
        this.tweens.add({
          targets: pad.sprite,
          scaleY: 0.55,
          duration: 70,
          yoyo: true,
          ease: 'Quad.easeOut',
        });
        break;
      }
      case 'speed': {
        const wasBoosted = now < this.runner.speedBoostUntil;
        this.runner.speedBoostUntil = now + SPEED_PAD_MS;
        this.trailEmitter?.start();
        if (!wasBoosted) {
          this.tweens.add({
            targets: pad.sprite,
            alpha: 0.4,
            duration: 90,
            yoyo: true,
            repeat: 2,
          });
        }
        break;
      }
      case 'gravity': {
        if (now - pad.lastTriggeredAt < GRAVITY_PAD_COOLDOWN_MS) return;
        pad.lastTriggeredAt = now;
        this.runner.flipGravity();
        this.dustEmitter?.explode(6, this.runner.sprite.x, this.runner.sprite.y);
        this.cameras.main.shake(70, 0.004);
        this.tweens.add({
          targets: pad.sprite,
          scale: 1.25,
          duration: 90,
          yoyo: true,
          ease: 'Quad.easeOut',
        });
        break;
      }
    }
  }

  private onRunnerJump(): void {
    if (!this.runner) return;
    this.playJuice(this.runner.sprite, 0.78, 1.22, 140);
  }

  private onRunnerLand(): void {
    if (!this.runner) return;
    this.playJuice(this.runner.sprite, 1.3, 0.72, 120);
    this.dustEmitter?.explode(6, this.runner.sprite.x, this.runner.feetY);
  }

  private stretchRunner(): void {
    if (this.runner) this.playJuice(this.runner.sprite, 0.7, 1.35, 180);
  }

  /** Squash-and-stretch: tween to the given scales and back to 1. */
  private playJuice(
    sprite: Phaser.GameObjects.Sprite,
    scaleX: number,
    scaleY: number,
    duration: number
  ): void {
    this.juiceTween?.stop();
    sprite.setScale(1);
    this.juiceTween = this.tweens.add({
      targets: sprite,
      scaleX,
      scaleY,
      duration: duration / 2,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => sprite.setScale(1),
    });
  }

  private kill(): void {
    if (!this.runner || !this.runtime || this.state !== 'running') return;
    this.state = 'dead';
    this.deaths += 1;
    this.hud?.setDeaths(this.deaths);

    this.deathEmitter?.explode(22, this.runner.sprite.x, this.runner.sprite.y);
    this.cameras.main.shake(180, 0.012);
    this.trailEmitter?.stop();
    this.runner.freeze();
    this.runner.sprite.setVisible(false);

    this.time.delayedCall(RESPAWN_DELAY_MS, () => this.respawn());
  }

  private respawn(): void {
    if (!this.runner || !this.runtime || this.state !== 'dead') return;
    this.coins = this.coinsAtRespawn;
    this.hud?.setCoins(this.coins);
    this.runtime.restore();
    this.tweens.killTweensOf(this.runner.sprite);
    this.runner.respawn(this.runtime.spawnX, this.runtime.spawnY);
    this.cameras.main.centerOn(this.runtime.spawnX, WORLD_H / 2);
    this.cameras.main.flash(120, 15, 22, 38);
    this.state = 'running';
  }

  private clearLevel(): void {
    if (!this.runner || this.state !== 'running') return;
    this.state = 'clear';
    this.splits.push(Math.round(this.levelElapsed));
    this.trailEmitter?.stop();

    // Celebration beat: hop + spin, flag pulse, banner — tweens, not modal.
    this.runner.freeze();
    this.juiceTween?.stop();
    this.runner.sprite.setScale(1);
    // Both tweens finish inside the clear beat, before the next level builds.
    this.tweens.add({
      targets: this.runner.sprite,
      y: this.runner.sprite.y - 14 * this.runner.gravityDir,
      duration: CLEAR_BEAT_MS * 0.4,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    this.tweens.add({
      targets: this.runner.sprite,
      angle: 360 * this.runner.gravityDir,
      duration: CLEAR_BEAT_MS * 0.8,
      ease: 'Quad.easeInOut',
    });
    if (this.runtime?.flag) {
      this.tweens.add({
        targets: this.runtime.flag,
        scale: 1.4,
        duration: 120,
        yoyo: true,
        repeat: 1,
      });
    }
    this.dustEmitter?.explode(10, this.runner.sprite.x, this.runner.sprite.y);
    this.showBanner('CLEAR!', '#4ade80');

    this.time.delayedCall(CLEAR_BEAT_MS, () => this.advance());
  }

  private advance(): void {
    this.levelIndex += 1;
    if (this.levelIndex >= this.levels.length) {
      this.finishRun();
      return;
    }
    this.buildLevel(this.levelIndex);
  }

  private buildLevel(index: number): void {
    if (!this.runner) return;
    for (const collider of this.colliders) collider.destroy();
    this.colliders = [];
    this.runtime?.destroy();

    const level = this.levelAt(index);
    this.runtime = new LevelRuntime(this, level);
    this.wireColliders(this.runner, this.runtime);
    this.tweens.killTweensOf(this.runner.sprite);
    this.runner.respawn(this.runtime.spawnX, this.runtime.spawnY);
    this.coinsAtRespawn = this.coins;
    this.levelElapsed = 0;
    this.state = 'running';

    this.hud?.setLevel(index, this.levels.length);
    this.cameras.main.centerOn(this.runtime.spawnX, WORLD_H / 2);
    this.cameras.main.fadeIn(200, 15, 22, 38);
    this.showBanner(level.name, '#ffffff');
  }

  private levelAt(index: number): Level {
    const level = this.levels[index];
    if (!level) throw new Error(`Run scene: missing level at index ${index}`);
    return level;
  }

  private finishRun(): void {
    const splitSum = this.splits.reduce((sum, ms) => sum + ms, 0);
    const results: RunResults = {
      splits: this.splits,
      deaths: this.deaths,
      coins: this.coins,
      totalMs: Math.max(0, splitSum - this.coins * COIN_BONUS_MS),
    };
    this.scene.start('Results', results);
  }

  private showBanner(message: string, color: string): void {
    if (!this.banner) return;
    this.tweens.killTweensOf(this.banner);
    const cam = this.cameras.main;
    const inv = 1 / cam.zoom;
    const pos = uiPoint(cam, cam.width / 2, cam.height * 0.38);
    this.banner.setText(message);
    this.banner.setColor(color);
    this.banner.setPosition(pos.x, pos.y);
    this.banner.setAlpha(0);
    this.tweens.add({
      targets: this.banner,
      alpha: { from: 0, to: 1 },
      scale: { from: inv * 1.6, to: inv },
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: this.banner, alpha: 0, delay: 450, duration: 250 });
      },
    });
  }

  private completedMs(): number {
    return this.splits.reduce((sum, ms) => sum + ms, 0);
  }
}
