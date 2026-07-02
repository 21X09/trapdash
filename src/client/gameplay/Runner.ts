import * as Phaser from 'phaser';
import {
  COYOTE_MS,
  GRAVITY,
  JUMP_BUFFER_MS,
  JUMP_CUT_FACTOR,
  JUMP_VELOCITY,
  RUNNER_H,
  RUNNER_W,
  RUN_SPEED,
  SPEED_PAD_MULTIPLIER,
  SPRING_VELOCITY,
} from './constants';
import { RUNNER_TEXTURE } from './textures';

export type RunnerCallbacks = {
  onJump: () => void;
  onLand: () => void;
};

export type GravityDir = 1 | -1;

/**
 * The auto-running player. Velocity is reasserted every frame so collisions
 * can never permanently stall it. Handles coyote time, jump buffering,
 * variable jump height, spring bounces and gravity flips.
 */
export class Runner {
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  gravityDir: GravityDir = 1;
  speedBoostUntil = 0;
  /** False while dead or during the level-clear beat. */
  controlEnabled = true;

  private coyoteUntil = 0;
  private jumpBufferedUntil = 0;
  private jumpCuttable = false;
  private wasGrounded = false;
  private readonly callbacks: RunnerCallbacks;

  constructor(scene: Phaser.Scene, x: number, y: number, callbacks: RunnerCallbacks) {
    this.callbacks = callbacks;
    this.sprite = scene.physics.add.sprite(x, y, RUNNER_TEXTURE);
    this.sprite.setDepth(5);
    this.sprite.body.setSize(RUNNER_W, RUNNER_H);
    this.sprite.body.setMaxVelocity(RUN_SPEED * SPEED_PAD_MULTIPLIER, 800);
    this.sprite.body.setGravityY(GRAVITY);
  }

  get grounded(): boolean {
    const body = this.sprite.body;
    return this.gravityDir > 0
      ? body.blocked.down || body.touching.down
      : body.blocked.up || body.touching.up;
  }

  /** Y of the runner's feet (the side gravity pulls towards). */
  get feetY(): number {
    return this.gravityDir > 0 ? this.sprite.body.bottom : this.sprite.body.top;
  }

  update(now: number): void {
    if (!this.controlEnabled) return;

    const boosted = now < this.speedBoostUntil;
    this.sprite.body.setVelocityX(RUN_SPEED * (boosted ? SPEED_PAD_MULTIPLIER : 1));

    const grounded = this.grounded;
    if (grounded) this.coyoteUntil = now + COYOTE_MS;
    if (now < this.jumpBufferedUntil && (grounded || now < this.coyoteUntil)) {
      this.doJump();
    }
    if (grounded && !this.wasGrounded) this.callbacks.onLand();
    this.wasGrounded = grounded;
  }

  pressJump(now: number): void {
    this.jumpBufferedUntil = now + JUMP_BUFFER_MS;
  }

  releaseJump(): void {
    const vy = this.sprite.body.velocity.y;
    const rising = this.gravityDir > 0 ? vy < 0 : vy > 0;
    if (this.jumpCuttable && rising) {
      this.sprite.body.setVelocityY(vy * JUMP_CUT_FACTOR);
    }
    this.jumpCuttable = false;
  }

  private doJump(): void {
    this.sprite.body.setVelocityY(-this.gravityDir * JUMP_VELOCITY);
    this.coyoteUntil = 0;
    this.jumpBufferedUntil = 0;
    this.jumpCuttable = true;
    this.wasGrounded = false;
    this.callbacks.onJump();
  }

  /** Strong bounce off a spring, respecting the current gravity direction. */
  springBounce(): void {
    this.sprite.body.setVelocityY(-this.gravityDir * SPRING_VELOCITY);
    this.coyoteUntil = 0;
    this.jumpBufferedUntil = 0;
    this.jumpCuttable = false;
  }

  flipGravity(): void {
    this.setGravityDir(this.gravityDir > 0 ? -1 : 1);
  }

  setGravityDir(dir: GravityDir): void {
    this.gravityDir = dir;
    this.sprite.body.setGravityY(GRAVITY * dir);
    this.sprite.setFlipY(dir < 0);
  }

  /** Stops physics and input response (death / level-clear). */
  freeze(): void {
    this.controlEnabled = false;
    this.sprite.body.stop();
    this.sprite.body.enable = false;
  }

  respawn(x: number, y: number): void {
    this.setGravityDir(1);
    this.speedBoostUntil = 0;
    this.coyoteUntil = 0;
    this.jumpBufferedUntil = 0;
    this.jumpCuttable = false;
    this.wasGrounded = false;
    this.sprite.body.enable = true;
    this.sprite.body.reset(x, y);
    this.sprite.setVisible(true);
    this.sprite.setAlpha(1);
    this.sprite.setScale(1);
    this.sprite.setAngle(0);
    this.controlEnabled = true;
  }
}
