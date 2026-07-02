export const GRID_W = 64;
export const GRID_H = 14;
export const TILE_PX = 16;

export const MAX_LEVEL_NAME = 24;
export const MAX_TILES = GRID_W * GRID_H;

export type TileId =
  | 'block'
  | 'spike'
  | 'saw'
  | 'spring'
  | 'crumble'
  | 'speed'
  | 'gravity'
  | 'coin'
  | 'start'
  | 'flag';

export const TILE_IDS: readonly TileId[] = [
  'block',
  'spike',
  'saw',
  'spring',
  'crumble',
  'speed',
  'gravity',
  'coin',
  'start',
  'flag',
] as const;

export type PlacedTile = {
  x: number;
  y: number;
  t: TileId;
};

/** Sparse list of placed tiles; empty cells are air. */
export type LevelGrid = PlacedTile[];

export type Level = {
  id: string;
  name: string;
  author: string;
  grid: LevelGrid;
  /** Author's proof-of-clear time — every stored level is completable. */
  authorTimeMs: number;
  createdAt: number;
};

export type LevelValidationResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Structural validation shared by the editor (before submit) and the server
 * (never trust the client). Completability is enforced separately via the
 * author's proof-of-clear run.
 */
export const validateLevelGrid = (grid: unknown): LevelValidationResult => {
  if (!Array.isArray(grid)) return { ok: false, error: 'grid must be an array' };
  if (grid.length === 0) return { ok: false, error: 'level is empty' };
  if (grid.length > MAX_TILES) return { ok: false, error: 'too many tiles' };

  const seen = new Set<number>();
  let starts = 0;
  let flags = 0;

  for (const tile of grid) {
    if (typeof tile !== 'object' || tile === null) {
      return { ok: false, error: 'malformed tile' };
    }
    const { x, y, t } = tile as PlacedTile;
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      return { ok: false, error: 'tile coordinates must be integers' };
    }
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) {
      return { ok: false, error: `tile out of bounds at (${x}, ${y})` };
    }
    if (!TILE_IDS.includes(t)) {
      return { ok: false, error: `unknown tile type: ${String(t)}` };
    }
    const key = y * GRID_W + x;
    if (seen.has(key)) {
      return { ok: false, error: `overlapping tiles at (${x}, ${y})` };
    }
    seen.add(key);
    if (t === 'start') starts++;
    if (t === 'flag') flags++;
  }

  if (starts !== 1) return { ok: false, error: 'level needs exactly one start' };
  if (flags !== 1) return { ok: false, error: 'level needs exactly one flag' };
  return { ok: true };
};
