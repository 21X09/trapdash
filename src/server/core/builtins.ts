import { GRID_W } from '../../shared/level';
import type { Level, LevelGrid, TileId } from '../../shared/level';
import { todayKey } from './days';
import {
  getDayLevelIds,
  saveLevel,
  setBuiltinLevelIds,
  setCurrentDay,
  setDayLevelIds,
} from './state';

/**
 * Hand-made starter levels. They seed the very first gauntlet and pad the
 * daily rotation whenever the community queue holds fewer than 3 candidates.
 *
 * Geometry notes (y = 0 is the TOP row, y = 13 the bottom):
 * - the runner auto-moves right at ~90 px/s (~5.6 tiles/s),
 * - a jump clears ~3 tiles up and ~4 tiles across,
 * - so single-tile hazards, 2-3 tile gaps and short crumble bridges are all
 *   comfortably clearable while still feeling like a run.
 */

export const BUILTIN_AUTHOR = 'TrapDash';

const GROUND_Y = 13;
const STAND_Y = 12;

const range = (from: number, to: number): number[] => {
  const xs: number[] = [];
  for (let x = from; x <= to; x++) xs.push(x);
  return xs;
};

/** Full bottom ground row (y=13) minus the given gap columns. */
const groundRow = (gaps: number[] = []): LevelGrid => {
  const gapSet = new Set(gaps);
  const tiles: LevelGrid = [];
  for (let x = 0; x < GRID_W; x++) {
    if (!gapSet.has(x)) tiles.push({ x, y: GROUND_Y, t: 'block' });
  }
  return tiles;
};

const tilesAt = (xs: number[], y: number, t: TileId): LevelGrid =>
  xs.map((x) => ({ x, y, t }));

const startAndFlag: LevelGrid = [
  { x: 1, y: STAND_Y, t: 'start' },
  { x: 62, y: STAND_Y, t: 'flag' },
];

/**
 * Level 1 — nearly flat run; two single-tile spike clusters on the ground
 * that a single relaxed jump clears.
 */
const warmupDashGrid: LevelGrid = [
  ...groundRow(),
  { x: 20, y: STAND_Y, t: 'spike' },
  { x: 40, y: STAND_Y, t: 'spike' },
  ...startAndFlag,
];

/**
 * Level 2 — a 2-tile floor gap, a 3-tile floor gap, and a spring near the
 * end for a celebratory bounce.
 */
const mindTheGapGrid: LevelGrid = [
  ...groundRow([...range(18, 19), ...range(38, 40)]),
  { x: 50, y: STAND_Y, t: 'spring' },
  ...startAndFlag,
];

/**
 * Level 3 — a saw to hop over, a 6-tile crumble bridge (keep moving!) and a
 * line of coins floating one jump above the bridge exit.
 */
const sawStreetGrid: LevelGrid = [
  ...groundRow(range(28, 33)),
  ...tilesAt(range(28, 33), GROUND_Y, 'crumble'),
  { x: 15, y: STAND_Y, t: 'saw' },
  ...tilesAt(range(44, 48), 11, 'coin'),
  ...startAndFlag,
];

type BuiltinDef = {
  id: string;
  name: string;
  grid: LevelGrid;
  authorTimeMs: number;
};

export const BUILTIN_LEVEL_DEFS: BuiltinDef[] = [
  { id: 'lv_builtin_1', name: 'Warmup Dash', grid: warmupDashGrid, authorTimeMs: 12000 },
  { id: 'lv_builtin_2', name: 'Mind the Gap', grid: mindTheGapGrid, authorTimeMs: 13000 },
  { id: 'lv_builtin_3', name: 'Saw Street', grid: sawStreetGrid, authorTimeMs: 14000 },
];

export const buildBuiltinLevels = (createdAt: number): Level[] =>
  BUILTIN_LEVEL_DEFS.map((def) => ({
    id: def.id,
    name: def.name,
    author: BUILTIN_AUTHOR,
    grid: def.grid,
    authorTimeMs: def.authorTimeMs,
    createdAt,
  }));

/**
 * Stores the builtin levels, remembers their ids for rotation padding and,
 * if today's gauntlet doesn't exist yet, makes them today's gauntlet.
 */
export const seedBuiltinLevels = async (): Promise<void> => {
  const levels = buildBuiltinLevels(Date.now());
  for (const level of levels) {
    await saveLevel(level);
  }
  const ids = levels.map((level) => level.id);
  await setBuiltinLevelIds(ids);

  const day = todayKey();
  const existing = await getDayLevelIds(day);
  if (!existing) {
    await setDayLevelIds(day, ids);
    await setCurrentDay(day);
  }
};
