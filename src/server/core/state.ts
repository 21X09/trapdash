import { redis } from '@devvit/web/server';
import type { Level } from '../../shared/level';

/**
 * Redis data model (see docs/SPEC.md):
 *
 *   day:current        -> "YYYYMMDD" (UTC)
 *   day:{d}            -> JSON { levelIds: string[] }
 *   level:{id}         -> JSON Level
 *   queue:candidates   -> zset levelId -> net votes
 *   voted:{levelId}    -> hash username -> "1" (vote dedupe; Devvit redis has no sets)
 *   submitted:{d}      -> hash username -> "1" (one submission per user per day)
 *   lb:{d}             -> zset username -> totalTimeMs (ascending; lower is better)
 *   user:{name}        -> JSON UserRecord
 *   levels:builtin     -> JSON string[] of builtin level ids (rotation padding)
 *   level:id-counter   -> integer counter behind generated level ids
 *   day:rotate-lock    -> hash day -> "1" (single-rotation guard)
 */
export const KEYS = {
  currentDay: 'day:current',
  day: (d: string): string => `day:${d}`,
  level: (id: string): string => `level:${id}`,
  candidates: 'queue:candidates',
  voted: (levelId: string): string => `voted:${levelId}`,
  submitted: (d: string): string => `submitted:${d}`,
  leaderboard: (d: string): string => `lb:${d}`,
  user: (name: string): string => `user:${name}`,
  builtinLevels: 'levels:builtin',
  levelCounter: 'level:id-counter',
  rotateLock: 'day:rotate-lock',
};

export type UserRecord = {
  streak: number;
  /** Day key of the user's last ranked run, or '' if they have never played. */
  lastPlayedDay: string;
  featuredCount: number;
};

type DayRecord = {
  levelIds: string[];
};

const parseJson = <T>(raw: string | undefined | null): T | undefined => {
  if (raw === undefined || raw === null) return undefined;
  const value: T = JSON.parse(raw);
  return value;
};

// --- days ---

export const getCurrentDay = async (): Promise<string | undefined> =>
  await redis.get(KEYS.currentDay);

export const setCurrentDay = async (day: string): Promise<void> => {
  await redis.set(KEYS.currentDay, day);
};

export const getDayLevelIds = async (
  day: string
): Promise<string[] | undefined> => {
  const record = parseJson<DayRecord>(await redis.get(KEYS.day(day)));
  return record?.levelIds;
};

export const setDayLevelIds = async (
  day: string,
  levelIds: string[]
): Promise<void> => {
  const record: DayRecord = { levelIds };
  await redis.set(KEYS.day(day), JSON.stringify(record));
};

// --- levels ---

export const getLevel = async (id: string): Promise<Level | undefined> =>
  parseJson<Level>(await redis.get(KEYS.level(id)));

/** Loads several levels at once; missing ids are silently dropped. */
export const getLevelsByIds = async (ids: string[]): Promise<Level[]> => {
  if (ids.length === 0) return [];
  const raws = await redis.mGet(ids.map((id) => KEYS.level(id)));
  const levels: Level[] = [];
  for (const raw of raws) {
    const level = parseJson<Level>(raw);
    if (level) levels.push(level);
  }
  return levels;
};

export const saveLevel = async (level: Level): Promise<void> => {
  await redis.set(KEYS.level(level.id), JSON.stringify(level));
};

/** Generates the next unique level id from a redis counter. */
export const nextLevelId = async (): Promise<string> => {
  const n = await redis.incrBy(KEYS.levelCounter, 1);
  return `lv_${n}`;
};

export const getBuiltinLevelIds = async (): Promise<string[]> =>
  parseJson<string[]>(await redis.get(KEYS.builtinLevels)) ?? [];

export const setBuiltinLevelIds = async (ids: string[]): Promise<void> => {
  await redis.set(KEYS.builtinLevels, JSON.stringify(ids));
};

// --- users ---

const defaultUser = (): UserRecord => ({
  streak: 0,
  lastPlayedDay: '',
  featuredCount: 0,
});

export const getUser = async (name: string): Promise<UserRecord> =>
  parseJson<UserRecord>(await redis.get(KEYS.user(name))) ?? defaultUser();

export const saveUser = async (
  name: string,
  record: UserRecord
): Promise<void> => {
  await redis.set(KEYS.user(name), JSON.stringify(record));
};

// --- hash-backed "sets" (Devvit redis exposes no native set commands) ---

export const isHashMember = async (
  key: string,
  field: string
): Promise<boolean> => (await redis.hGet(key, field)) !== undefined;

/**
 * Atomically adds a member; returns true only for the first caller
 * (hSetNX returns 1 when the field was newly created).
 */
export const addHashMember = async (
  key: string,
  field: string
): Promise<boolean> => (await redis.hSetNX(key, field, '1')) === 1;
