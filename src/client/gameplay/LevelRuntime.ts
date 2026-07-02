import * as Phaser from 'phaser';
import type { Level } from '../../shared/level';
import { TILE_PX } from '../../shared/level';
import { CRUMBLE_DELAY_MS, CRUMBLE_FALL_MS, RUNNER_H } from './constants';
import { tileTexture } from './textures';

export type PadKind = 'spring' | 'speed' | 'gravity';

export type StaticTile = Phaser.Types.Physics.Arcade.ImageWithStaticBody;

export type PadEntry = {
  kind: PadKind;
  sprite: StaticTile;
  lastTriggeredAt: number;
};

export type CoinEntry = {
  sprite: StaticTile;
  collected: boolean;
  popTween: Phaser.Tweens.Tween | null;
};

export type CrumbleEntry = {
  sprite: StaticTile;
  homeX: number;
  homeY: number;
  state: 'idle' | 'breaking' | 'gone';
  timer: Phaser.Time.TimerEvent | null;
  tween: Phaser.Tweens.Tween | null;
};

const centerOf = (tx: number, ty: number): { x: number; y: number } => ({
  x: tx * TILE_PX + TILE_PX / 2,
  y: ty * TILE_PX + TILE_PX / 2,
});

/**
 * Builds a playable Arcade-physics level from a shared Level's sparse grid:
 * a static group for solids (block + crumble), overlap groups for hazards
 * (spike, saw), pads (spring, speed, gravity), coins, and the flag.
 * Transient state (crumbles, coins) can be restored on respawn.
 */
export class LevelRuntime {
  readonly solids: Phaser.Physics.Arcade.StaticGroup;
  readonly hazards: Phaser.Physics.Arcade.StaticGroup;
  readonly pads: Phaser.Physics.Arcade.StaticGroup;
  readonly coins: Phaser.Physics.Arcade.StaticGroup;
  readonly flag: StaticTile | null = null;
  /** Runner spawn point (px, sprite center), derived from the start tile. */
  readonly spawnX: number;
  readonly spawnY: number;

  readonly crumbleByObject = new Map<unknown, CrumbleEntry>();
  readonly coinByObject = new Map<unknown, CoinEntry>();
  readonly padByObject = new Map<unknown, PadEntry>();

  private readonly scene: Phaser.Scene;
  private readonly crumbles: CrumbleEntry[] = [];
  private readonly coinEntries: CoinEntry[] = [];
  private readonly ambientTweens: Phaser.Tweens.Tween[] = [];

  constructor(scene: Phaser.Scene, level: Level) {
    this.scene = scene;
    this.solids = scene.physics.add.staticGroup();
    this.hazards = scene.physics.add.staticGroup();
    this.pads = scene.physics.add.staticGroup();
    this.coins = scene.physics.add.staticGroup();

    const solidCells = new Set<string>();
    for (const tile of level.grid) {
      if (tile.t === 'block' || tile.t === 'crumble') {
        solidCells.add(`${tile.x},${tile.y}`);
      }
    }

    let spawnX = TILE_PX * 1.5;
    let spawnY = TILE_PX * 13 - RUNNER_H / 2;

    for (const tile of level.grid) {
      const { x, y } = centerOf(tile.x, tile.y);
      switch (tile.t) {
        case 'block': {
          this.solids.add(this.makeTile(x, y, 'block'));
          break;
        }
        case 'crumble': {
          const sprite = this.makeTile(x, y, 'crumble');
          this.solids.add(sprite);
          const entry: CrumbleEntry = {
            sprite,
            homeX: x,
            homeY: y,
            state: 'idle',
            timer: null,
            tween: null,
          };
          this.crumbles.push(entry);
          this.crumbleByObject.set(sprite, entry);
          break;
        }
        case 'spike': {
          const sprite = this.makeTile(x, y, 'spike');
          // Point spikes away from the surface they sit on.
          const solidAbove = solidCells.has(`${tile.x},${tile.y - 1}`);
          const solidBelow = solidCells.has(`${tile.x},${tile.y + 1}`);
          if (solidAbove && !solidBelow) sprite.setFlipY(true);
          // Forgiving hitbox.
          sprite.body.setSize(10, 10);
          this.hazards.add(sprite);
          break;
        }
        case 'saw': {
          const sprite = this.makeTile(x, y, 'saw');
          sprite.body.setCircle(6, 2, 2);
          this.hazards.add(sprite);
          this.ambientTweens.push(
            this.scene.tweens.add({ targets: sprite, angle: 360, duration: 900, repeat: -1 })
          );
          break;
        }
        case 'spring':
        case 'speed':
        case 'gravity': {
          const sprite = this.makeTile(x, y, tile.t);
          this.pads.add(sprite);
          const entry: PadEntry = { kind: tile.t, sprite, lastTriggeredAt: -Infinity };
          this.padByObject.set(sprite, entry);
          break;
        }
        case 'coin': {
          const sprite = this.makeTile(x, y, 'coin');
          sprite.body.setCircle(5, 3, 3);
          this.coins.add(sprite);
          const entry: CoinEntry = { sprite, collected: false, popTween: null };
          this.coinEntries.push(entry);
          this.coinByObject.set(sprite, entry);
          this.ambientTweens.push(
            this.scene.tweens.add({
              targets: sprite,
              y: y - 1.5,
              duration: 700,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut',
              delay: (tile.x * 97) % 400,
            })
          );
          break;
        }
        case 'flag': {
          this.flag = this.makeTile(x, y, 'flag');
          break;
        }
        case 'start': {
          this.makeDecor(x, y, 'start');
          spawnX = x;
          spawnY = (tile.y + 1) * TILE_PX - RUNNER_H / 2;
          break;
        }
      }
    }

    this.spawnX = spawnX;
    this.spawnY = spawnY;
  }

  /** Called by the Run scene when the runner touches a crumble tile. */
  triggerCrumble(entry: CrumbleEntry): void {
    if (entry.state !== 'idle') return;
    entry.state = 'breaking';
    entry.tween = this.scene.tweens.add({
      targets: entry.sprite,
      angle: { from: -3, to: 3 },
      x: { from: entry.homeX - 1, to: entry.homeX + 1 },
      duration: 45,
      yoyo: true,
      repeat: -1,
    });
    entry.timer = this.scene.time.delayedCall(CRUMBLE_DELAY_MS, () => this.dropCrumble(entry));
  }

  private dropCrumble(entry: CrumbleEntry): void {
    entry.state = 'gone';
    entry.tween?.stop();
    entry.sprite.body.enable = false;
    entry.tween = this.scene.tweens.add({
      targets: entry.sprite,
      y: entry.homeY + 40,
      angle: 25,
      alpha: 0,
      duration: CRUMBLE_FALL_MS,
      ease: 'Quad.easeIn',
    });
  }

  /** Called by the Run scene when the runner overlaps an uncollected coin. */
  collectCoin(entry: CoinEntry): void {
    if (entry.collected) return;
    entry.collected = true;
    entry.sprite.body.enable = false;
    entry.popTween = this.scene.tweens.add({
      targets: entry.sprite,
      scale: 1.7,
      alpha: 0,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => entry.sprite.setVisible(false),
    });
  }

  /** Restores crumbles and coins for a fresh attempt (called on respawn). */
  restore(): void {
    for (const entry of this.crumbles) {
      entry.timer?.remove(false);
      entry.timer = null;
      entry.tween?.stop();
      entry.tween = null;
      entry.state = 'idle';
      entry.sprite.setPosition(entry.homeX, entry.homeY);
      entry.sprite.setAngle(0);
      entry.sprite.setAlpha(1);
      entry.sprite.setVisible(true);
      entry.sprite.body.enable = true;
    }
    for (const entry of this.coinEntries) {
      if (!entry.collected) continue;
      entry.popTween?.stop();
      entry.popTween = null;
      entry.collected = false;
      entry.sprite.setScale(1);
      entry.sprite.setAlpha(1);
      entry.sprite.setVisible(true);
      entry.sprite.body.enable = true;
    }
  }

  destroy(): void {
    for (const entry of this.crumbles) {
      entry.timer?.remove(false);
      entry.tween?.stop();
    }
    for (const entry of this.coinEntries) {
      entry.popTween?.stop();
    }
    for (const tween of this.ambientTweens) {
      tween.stop();
    }
    this.solids.destroy(true);
    this.hazards.destroy(true);
    this.pads.destroy(true);
    this.coins.destroy(true);
    this.flag?.destroy();
  }

  private makeTile(x: number, y: number, t: Parameters<typeof tileTexture>[0]): StaticTile {
    return this.scene.physics.add.staticImage(x, y, tileTexture(t));
  }

  private makeDecor(x: number, y: number, t: Parameters<typeof tileTexture>[0]): void {
    this.scene.add.image(x, y, tileTexture(t));
  }
}
