import { redis } from '@devvit/web/server';
import { todayKey } from './days';
import {
  KEYS,
  addHashMember,
  getBuiltinLevelIds,
  getCurrentDay,
  getDayLevelIds,
  getLevel,
  getUser,
  saveUser,
  setCurrentDay,
  setDayLevelIds,
} from './state';

export type DayState = {
  day: string;
  levelIds: string[];
};

const GAUNTLET_SIZE = 3;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Rolls the gauntlet over to `day`: pops the top-voted candidates from the
 * queue, pads with builtin levels when fewer than 3 exist, stores the day
 * and credits each featured author. Callers must ensure `day:{day}` does not
 * already exist (or hold the rotation lock) to avoid draining the queue twice.
 */
export const rotateToDay = async (day: string): Promise<string[]> => {
  const top = await redis.zRange(KEYS.candidates, 0, GAUNTLET_SIZE - 1, {
    by: 'rank',
    reverse: true,
  });
  const winnerIds = top.map((entry) => entry.member);
  if (winnerIds.length > 0) {
    await redis.zRem(KEYS.candidates, winnerIds);
  }

  const levelIds = [...winnerIds];
  if (levelIds.length < GAUNTLET_SIZE) {
    for (const id of await getBuiltinLevelIds()) {
      if (levelIds.length >= GAUNTLET_SIZE) break;
      if (!levelIds.includes(id)) levelIds.push(id);
    }
  }

  await setDayLevelIds(day, levelIds);
  await setCurrentDay(day);

  for (const id of winnerIds) {
    const level = await getLevel(id);
    if (!level) continue;
    const author = await getUser(level.author);
    author.featuredCount += 1;
    await saveUser(level.author, author);
  }

  return levelIds;
};

/**
 * Resolves today's gauntlet, lazily rotating the day if the cron hasn't run
 * yet (or `day:current` is stale). Safe to call from any request handler.
 */
export const ensureToday = async (): Promise<DayState> => {
  const day = todayKey();

  const existing = await getDayLevelIds(day);
  if (existing) {
    if ((await getCurrentDay()) !== day) await setCurrentDay(day);
    return { day, levelIds: existing };
  }

  // First caller wins the rotation; concurrent callers wait for its result.
  const isRotationOwner = await addHashMember(KEYS.rotateLock, day);
  if (!isRotationOwner) {
    await sleep(250);
    const rotated = await getDayLevelIds(day);
    if (rotated) return { day, levelIds: rotated };
    // Rotation still in flight: serve builtins without touching the queue.
    const builtins = await getBuiltinLevelIds();
    return { day, levelIds: builtins.slice(0, GAUNTLET_SIZE) };
  }

  return { day, levelIds: await rotateToDay(day) };
};
