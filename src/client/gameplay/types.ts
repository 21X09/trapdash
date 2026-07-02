import type { Level } from '../../shared/level';

/** Data passed to the Run scene. */
export type RunConfig = {
  levels: Level[];
};

/** Data passed from Run to the Results scene. */
export type RunResults = {
  /** Per-level clear times, ms, in play order. */
  splits: number[];
  deaths: number;
  coins: number;
  /** sum(splits) − coins * COIN_BONUS_MS, floored at 0. */
  totalMs: number;
};
