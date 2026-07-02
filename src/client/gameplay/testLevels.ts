import type { Level, PlacedTile, TileId } from '../../shared/level';
import { validateLevelGrid } from '../../shared/level';

/**
 * Three hand-authored levels of rising difficulty that together exercise every
 * tile type. All jumps are checked against the physics constants:
 * jump apex ≈ 3.8 tiles, full-jump reach ≈ 4 tiles at run speed
 * (see gameplay/constants.ts). Gaps here are ≤ 3 tiles and walls ≤ 2 tiles
 * unless a spring (or a stalled wall-jump) assists.
 */

const at = (x: number, y: number, t: TileId): PlacedTile => ({ x, y, t });

/** A horizontal run of the same tile, inclusive of both ends. */
const span = (x0: number, x1: number, y: number, t: TileId): PlacedTile[] => {
  const tiles: PlacedTile[] = [];
  for (let x = x0; x <= x1; x++) tiles.push(at(x, y, t));
  return tiles;
};

const makeLevel = (id: string, name: string, parts: (PlacedTile | PlacedTile[])[]): Level => {
  const grid = parts.flat();
  const result = validateLevelGrid(grid);
  if (!result.ok) {
    throw new Error(`test level "${name}" is invalid: ${result.error}`);
  }
  return { id, name, author: 'trapdash', grid, authorTimeMs: 20000, createdAt: 0 };
};

/**
 * Level 1 — "First Steps": run, jump two gaps (2 and 3 tiles), hop a spike and
 * a low step, then ride a spring over a 2-tile wall. Gentle coin trail.
 */
const level1 = makeLevel('test-1', 'First Steps', [
  at(1, 12, 'start'),
  // Ground with two gaps: x16–17 (2 tiles) and x31–33 (3 tiles).
  span(0, 15, 13, 'block'),
  span(18, 30, 13, 'block'),
  span(34, 63, 13, 'block'),
  // Warm-up coin on the path.
  at(10, 12, 'coin'),
  // Coins arcing over the first gap.
  at(16, 10, 'coin'),
  at(17, 10, 'coin'),
  // Single spike to hop.
  at(24, 12, 'spike'),
  // Coins over the 3-tile gap.
  at(31, 10, 'coin'),
  at(32, 10, 'coin'),
  at(33, 10, 'coin'),
  // Low step (1 tile high) — teaches jumping at walls.
  at(40, 12, 'block'),
  at(41, 12, 'block'),
  // Spring launch over a 2-tile wall, with coins up the arc.
  at(50, 12, 'spring'),
  at(51, 9, 'coin'),
  at(52, 5, 'coin'),
  at(53, 12, 'block'),
  at(53, 11, 'block'),
  at(62, 12, 'flag'),
]);

/**
 * Level 2 — "Crumble Run": crumble bridges over pits, a saw, a speed pad
 * section, and paired spikes. Keep moving or the floor won't be there.
 */
const level2 = makeLevel('test-2', 'Crumble Run', [
  at(1, 12, 'start'),
  // Ground segments.
  span(0, 12, 13, 'block'),
  span(18, 30, 13, 'block'),
  span(33, 40, 13, 'block'),
  span(44, 52, 13, 'block'),
  span(57, 63, 13, 'block'),
  // Crumble bridge #1 over a pit (x13–17).
  span(13, 17, 13, 'crumble'),
  at(8, 12, 'coin'),
  // Saw on the ground — jump it, grab the coins on the way down.
  at(22, 12, 'saw'),
  at(24, 10, 'coin'),
  at(25, 10, 'coin'),
  // 2-tile gap with coins.
  at(31, 10, 'coin'),
  at(32, 10, 'coin'),
  // Speed pad: 1.5x for 2 s carries through the next gap and the spikes.
  at(34, 12, 'speed'),
  at(38, 12, 'coin'),
  // 3-tile gap (x41–43) at boosted speed.
  at(42, 10, 'coin'),
  // Paired spikes — one clean jump clears both.
  at(47, 12, 'spike'),
  at(48, 12, 'spike'),
  // Crumble bridge #2 (x53–56) with run-through coins.
  span(53, 56, 13, 'crumble'),
  at(54, 12, 'coin'),
  at(55, 12, 'coin'),
  at(62, 12, 'flag'),
]);

/**
 * Level 3 — "Upside Down": the gravity-pad showcase. Flip to the ceiling over
 * a pit, dodge hanging spikes, flip back, then spring over a 3-tile wall onto
 * a crumble bridge above a spike bed.
 */
const level3 = makeLevel('test-3', 'Upside Down', [
  at(1, 12, 'start'),
  // Ground: solid except the pit at x21–27 (crossed on the ceiling).
  span(0, 20, 13, 'block'),
  span(28, 63, 13, 'block'),
  // Ceiling for the inverted stretch.
  span(14, 30, 0, 'block'),
  at(6, 12, 'coin'),
  at(7, 12, 'coin'),
  // Paired spikes before the flip.
  at(10, 12, 'spike'),
  at(11, 12, 'spike'),
  // Flip up to the ceiling…
  at(16, 12, 'gravity'),
  at(21, 1, 'coin'),
  at(22, 1, 'coin'),
  // …dodge hanging spikes (jump "down" while inverted)…
  at(24, 1, 'spike'),
  at(25, 1, 'spike'),
  at(24, 3, 'coin'),
  // …and flip back to the floor.
  at(29, 1, 'gravity'),
  at(31, 7, 'coin'),
  // Saw, then a spring over a 3-tile wall (stalled wall-jump also works).
  at(37, 12, 'saw'),
  at(40, 12, 'spring'),
  at(40, 8, 'coin'),
  at(42, 12, 'block'),
  at(42, 11, 'block'),
  at(42, 10, 'block'),
  // Crumble bridge above a spike bed — land from the spring and keep moving.
  span(45, 50, 11, 'crumble'),
  span(46, 49, 12, 'spike'),
  at(47, 10, 'coin'),
  // Final stretch.
  at(55, 12, 'saw'),
  at(58, 12, 'coin'),
  at(62, 12, 'flag'),
]);

/** The hardcoded gauntlet used until the server wires up daily levels. */
export const TEST_LEVELS: Level[] = [level1, level2, level3];
