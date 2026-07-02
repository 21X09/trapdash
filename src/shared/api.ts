import type { Level, LevelGrid } from './level';

export type UserState = {
  username: string;
  streak: number;
  /** True once the user has posted a ranked gauntlet run today. */
  playedToday: boolean;
  /** True once the user has submitted a level today (limit: 1/day). */
  submittedToday: boolean;
  /** How many of this user's levels have been featured in a daily gauntlet. */
  featuredCount: number;
};

export type InitResponse = {
  type: 'init';
  postId: string;
  /** Day key, YYYYMMDD (UTC). */
  day: string;
  /** Today's gauntlet, in play order. */
  levels: Level[];
  user: UserState;
};

export type RunSubmitRequest = {
  /** Per-level clear times, ms, in gauntlet order. */
  splits: number[];
  deaths: number;
  /** Coins collected; the server applies the COIN_BONUS_MS discount. */
  coins: number;
};

export type RunSubmitResponse = {
  type: 'run';
  totalMs: number;
  rank: number;
  players: number;
  streak: number;
  /** False if a better run today already holds the user's leaderboard slot. */
  improved: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  username: string;
  timeMs: number;
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  day: string;
  entries: LeaderboardEntry[];
  you: LeaderboardEntry | null;
};

export type LevelSubmitRequest = {
  name: string;
  grid: LevelGrid;
  /** Proof-of-clear: the author's own completion time in the editor's test mode. */
  authorTimeMs: number;
};

export type LevelSubmitResponse = {
  type: 'level';
  id: string;
};

export type VoteDealResponse = {
  type: 'voteDeal';
  /** Up to 2 candidate levels the user hasn't voted on. */
  levels: Level[];
};

export type VoteRequest = {
  levelId: string;
  up: boolean;
};

export type VoteResponse = {
  type: 'vote';
  ok: boolean;
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};
