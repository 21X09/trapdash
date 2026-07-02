import { GRID_H, GRID_W, TILE_PX } from '../../shared/level';

/**
 * Every gameplay tunable in one place.
 *
 * Jump math (for level design):
 * - apex height  = JUMP_VELOCITY^2 / (2 * GRAVITY) = 340^2 / 1900 ≈ 60.9 px ≈ 3.8 tiles
 *   → clears a 3-tile wall with ~0.8 tiles of margin.
 * - full-jump air time = 2 * JUMP_VELOCITY / GRAVITY ≈ 0.716 s
 *   → horizontal reach at RUN_SPEED ≈ 64 px ≈ 4 tiles (plus body width + coyote slack).
 * - design rule: gaps ≤ 3 tiles, walls ≤ 2 tiles (3 with a spring or a stalled jump).
 */

/** Auto-run speed, px/s. */
export const RUN_SPEED = 90;

/** Downward acceleration, px/s^2 (applied per-body so it can be flipped). */
export const GRAVITY = 950;

/** Initial jump speed, px/s (see jump math above). */
export const JUMP_VELOCITY = 340;

/** Releasing jump early multiplies the remaining rise velocity by this. */
export const JUMP_CUT_FACTOR = 0.45;

/** Grace period after running off a ledge in which a jump still works. */
export const COYOTE_MS = 80;

/** A jump pressed this early before landing is still honoured. */
export const JUMP_BUFFER_MS = 100;

/** Spring launch speed, px/s (~1.6x jump → apex ≈ 9.7 tiles). */
export const SPRING_VELOCITY = 544;

/** Minimum gap between two bounces off the same spring. */
export const SPRING_COOLDOWN_MS = 250;

/** Speed pad: run-speed multiplier and boost duration. */
export const SPEED_PAD_MULTIPLIER = 1.5;
export const SPEED_PAD_MS = 2000;

/** A gravity pad cannot re-trigger for this long (runner crosses it in ~180 ms). */
export const GRAVITY_PAD_COOLDOWN_MS = 600;

/** Crumble tiles wobble for this long after being touched, then fall away. */
export const CRUMBLE_DELAY_MS = 300;
export const CRUMBLE_FALL_MS = 350;

/** Each collected coin shaves this off the final time (shared with server). */
export { COIN_BONUS_MS } from '../../shared/level';

/** Death → back at the level start (spec: under 500 ms). */
export const RESPAWN_DELAY_MS = 400;

/** Celebration beat between levels. */
export const CLEAR_BEAT_MS = 600;

/** Runner sprite/body size, px. */
export const RUNNER_W = 12;
export const RUNNER_H = 14;

/** World size in px (64 x 14 tiles of 16 px). */
export const WORLD_W = GRID_W * TILE_PX;
export const WORLD_H = GRID_H * TILE_PX;

/** Camera leads the runner by this many px. */
export const CAMERA_LOOKAHEAD = 56;

/** Leaving the vertical world bounds by more than this kills the runner. */
export const DEATH_MARGIN = 32;
