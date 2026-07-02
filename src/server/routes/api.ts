import { Hono } from 'hono';
import type { Context } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  ErrorResponse,
  InitResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  LevelSubmitRequest,
  LevelSubmitResponse,
  RunSubmitRequest,
  RunSubmitResponse,
  UserState,
  VoteDealResponse,
  VoteRequest,
  VoteResponse,
} from '../../shared/api';
import type { Level } from '../../shared/level';
import {
  COIN_BONUS_MS,
  MAX_LEVEL_NAME,
  validateLevelGrid,
} from '../../shared/level';
import { isValidDayKey, previousDayKey, todayKey } from '../core/days';
import { ensureToday } from '../core/rotation';
import {
  KEYS,
  addHashMember,
  getLevel,
  getLevelsByIds,
  getUser,
  isHashMember,
  nextLevelId,
  saveLevel,
  saveUser,
} from '../core/state';

/** Anti-cheat floors: no level clears under 1s, no gauntlet under 3s. */
const MIN_SPLIT_MS = 1000;
const MIN_TOTAL_MS = 3000;
const MIN_AUTHOR_TIME_MS = 1000;
const LEADERBOARD_TOP_N = 10;
/** How many top candidates to consider when dealing levels to vote on. */
const VOTE_DEAL_WINDOW = 50;
const VOTE_DEAL_SIZE = 2;
/** Generous ceiling on coins per run; real gauntlets hold far fewer. */
const MAX_RUN_COINS = 100;

const errorJson = (c: Context, message: string, status: 400 | 401 | 404) =>
  c.json<ErrorResponse>({ status: 'error', message }, status);

const readBody = async <T>(c: Context): Promise<T | undefined> => {
  try {
    return await c.req.json<T>();
  } catch {
    return undefined;
  }
};

/** The streak a user sees: stored streak, unless it already lapsed. */
const effectiveStreak = (
  streak: number,
  lastPlayedDay: string,
  today: string
): number =>
  lastPlayedDay === today || lastPlayedDay === previousDayKey(today)
    ? streak
    : 0;

export const api = new Hono();

api.get('/init', async (c) => {
  const { postId } = context;
  if (!postId) {
    console.error('API Init Error: postId not found in devvit context');
    return errorJson(c, 'postId is required but missing from context', 400);
  }

  try {
    const username = await reddit.getCurrentUsername();
    if (!username) return errorJson(c, 'must be logged in to play', 401);

    const { day, levelIds } = await ensureToday();
    const [levels, record, playedScore, submittedToday] = await Promise.all([
      getLevelsByIds(levelIds),
      getUser(username),
      redis.zScore(KEYS.leaderboard(day), username),
      isHashMember(KEYS.submitted(day), username),
    ]);

    const user: UserState = {
      username,
      streak: effectiveStreak(record.streak, record.lastPlayedDay, day),
      playedToday: playedScore !== undefined,
      submittedToday,
      featuredCount: record.featuredCount,
    };

    return c.json<InitResponse>({ type: 'init', postId, day, levels, user });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    const message =
      error instanceof Error
        ? `Initialization failed: ${error.message}`
        : 'Unknown error during initialization';
    return errorJson(c, message, 400);
  }
});

api.post('/run', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) return errorJson(c, 'must be logged in to submit a run', 401);

  const body = await readBody<RunSubmitRequest>(c);
  if (!body) return errorJson(c, 'invalid request body', 400);

  const { splits, deaths, coins } = body;
  if (!Number.isInteger(deaths) || deaths < 0) {
    return errorJson(c, 'invalid death count', 400);
  }
  if (!Number.isInteger(coins) || coins < 0 || coins > MAX_RUN_COINS) {
    return errorJson(c, 'invalid coin count', 400);
  }

  const { day, levelIds } = await ensureToday();
  if (
    !Array.isArray(splits) ||
    splits.length !== levelIds.length ||
    !splits.every((split) => Number.isFinite(split))
  ) {
    return errorJson(c, `expected ${levelIds.length} numeric splits`, 400);
  }
  if (splits.some((split) => split < MIN_SPLIT_MS)) {
    return errorJson(c, 'run rejected: impossible level split', 400);
  }

  const rawTotalMs = Math.round(splits.reduce((sum, split) => sum + split, 0));
  if (rawTotalMs < MIN_TOTAL_MS) {
    return errorJson(c, 'run rejected: impossible total time', 400);
  }
  const totalMs = Math.max(MIN_SPLIT_MS, rawTotalMs - coins * COIN_BONUS_MS);

  const lbKey = KEYS.leaderboard(day);
  const existing = await redis.zScore(lbKey, username);
  const improved = existing === undefined || totalMs < existing;
  if (improved) {
    await redis.zAdd(lbKey, { member: username, score: totalMs });
  }

  const record = await getUser(username);
  if (record.lastPlayedDay !== day) {
    record.streak = record.lastPlayedDay === previousDayKey(day) ? record.streak + 1 : 1;
    record.lastPlayedDay = day;
    await saveUser(username, record);
  }

  const [rank, players] = await Promise.all([
    redis.zRank(lbKey, username),
    redis.zCard(lbKey),
  ]);

  return c.json<RunSubmitResponse>({
    type: 'run',
    totalMs,
    rank: (rank ?? 0) + 1,
    players,
    streak: record.streak,
    improved,
  });
});

api.get('/leaderboard', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) return errorJson(c, 'must be logged in', 401);

  const dayParam = c.req.query('day');
  const day = dayParam && isValidDayKey(dayParam) ? dayParam : todayKey();
  const lbKey = KEYS.leaderboard(day);

  const [top, score, rank] = await Promise.all([
    redis.zRange(lbKey, 0, LEADERBOARD_TOP_N - 1, { by: 'rank' }),
    redis.zScore(lbKey, username),
    redis.zRank(lbKey, username),
  ]);

  const entries: LeaderboardEntry[] = top.map((entry, i) => ({
    rank: i + 1,
    username: entry.member,
    timeMs: entry.score,
  }));

  const you: LeaderboardEntry | null =
    score !== undefined && rank !== undefined
      ? { rank: rank + 1, username, timeMs: score }
      : null;

  return c.json<LeaderboardResponse>({ type: 'leaderboard', day, entries, you });
});

api.post('/level', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) return errorJson(c, 'must be logged in to submit a level', 401);

  const body = await readBody<LevelSubmitRequest>(c);
  if (!body) return errorJson(c, 'invalid request body', 400);

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length === 0 || name.length > MAX_LEVEL_NAME) {
    return errorJson(c, `name must be 1-${MAX_LEVEL_NAME} characters`, 400);
  }

  const gridResult = validateLevelGrid(body.grid);
  if (!gridResult.ok) return errorJson(c, gridResult.error, 400);

  const { authorTimeMs } = body;
  if (!Number.isFinite(authorTimeMs) || authorTimeMs < MIN_AUTHOR_TIME_MS) {
    return errorJson(c, 'invalid proof-of-clear time', 400);
  }

  const { day } = await ensureToday();
  const claimed = await addHashMember(KEYS.submitted(day), username);
  if (!claimed) {
    return errorJson(c, 'you already submitted a level today', 400);
  }

  const level: Level = {
    id: await nextLevelId(),
    name,
    author: username,
    grid: body.grid,
    authorTimeMs: Math.round(authorTimeMs),
    createdAt: Date.now(),
  };
  await saveLevel(level);
  await redis.zAdd(KEYS.candidates, { member: level.id, score: 0 });

  return c.json<LevelSubmitResponse>({ type: 'level', id: level.id });
});

api.get('/vote/deal', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) return errorJson(c, 'must be logged in to vote', 401);

  const { levelIds: featuredToday } = await ensureToday();
  const featured = new Set(featuredToday);

  const window = await redis.zRange(KEYS.candidates, 0, VOTE_DEAL_WINDOW - 1, {
    by: 'rank',
    reverse: true,
  });
  const candidateIds = window
    .map((entry) => entry.member)
    .filter((id) => !featured.has(id));

  const candidates = await getLevelsByIds(candidateIds);
  const dealt: Level[] = [];
  for (const level of candidates) {
    if (dealt.length >= VOTE_DEAL_SIZE) break;
    if (level.author === username) continue;
    if (await isHashMember(KEYS.voted(level.id), username)) continue;
    dealt.push(level);
  }

  return c.json<VoteDealResponse>({ type: 'voteDeal', levels: dealt });
});

api.post('/vote', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) return errorJson(c, 'must be logged in to vote', 401);

  const body = await readBody<VoteRequest>(c);
  if (!body || typeof body.levelId !== 'string' || typeof body.up !== 'boolean') {
    return errorJson(c, 'invalid request body', 400);
  }

  const level = await getLevel(body.levelId);
  if (!level) return errorJson(c, 'level not found', 404);
  if (level.author === username) {
    return errorJson(c, 'you cannot vote on your own level', 400);
  }

  // Only levels still in the candidate queue can collect votes.
  const inQueue = await redis.zScore(KEYS.candidates, body.levelId);
  if (inQueue === undefined) {
    return c.json<VoteResponse>({ type: 'vote', ok: false });
  }

  const firstVote = await addHashMember(KEYS.voted(body.levelId), username);
  if (!firstVote) {
    return c.json<VoteResponse>({ type: 'vote', ok: false });
  }

  await redis.zIncrBy(KEYS.candidates, body.levelId, body.up ? 1 : -1);
  return c.json<VoteResponse>({ type: 'vote', ok: true });
});
