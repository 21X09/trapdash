# TrapDash — Game Spec

*Reddit "Games with a Hook" hackathon entry. Deadline: July 15, 2026, 6:00 PM PDT.*

## One-liner

Players build short trap levels; the community's top-voted creations become tomorrow's
daily gauntlet that everyone speedruns. The game generates its own content forever.

## Core gameplay: the Run

One-touch auto-runner platformer (mobile-first, works in Reddit's webview):

- The runner moves forward automatically at a fixed speed.
- **Tap / press** = jump. Hold slightly for a higher jump. Coyote time (~80ms) and
  jump buffering (~100ms) for forgiving feel.
- Touch a hazard or fall off → instant restart of the current level (fast, no menus).
- Reach the flag → level clear. Levels are short: 10–25 seconds each.

A **Daily Gauntlet** = 3 community-made levels played back-to-back. The clock runs
across all 3; deaths don't reset the clock (they punish time). Best total time of the
day = your rank on the daily leaderboard.

## Tile palette (editor + runtime)

| Tile | Behavior |
|------|----------|
| Block | Solid ground |
| Spike | Kill on touch (placeable on any surface orientation) |
| Saw | Spinning kill hazard, sits on a surface |
| Spring | Bounces the runner high |
| Crumble | Solid, breaks ~0.3s after being stood on |
| Speed pad | Temporarily boosts run speed |
| Gravity pad | Flips gravity (run on ceiling) — the signature twist |
| Coin | Optional pickup; each coin collected shaves 0.25s off your time |
| Start / Flag | Level start and finish (exactly one each) |

Small palette, deep interactions. Levels are a fixed grid: **64 wide × 14 tall**,
16px tiles (1024×224 world, camera follows runner).

## The daily loop (retention engine)

1. **Play** — today's gauntlet drops at 00:00 UTC. Run it, get ranked, keep your streak.
2. **Build** — every player may submit **one level per day** in the editor.
   Submission requires a **proof-of-clear**: you must beat your own level first.
   This guarantees every level in the pool is completable.
3. **Vote** — after your daily run, you're dealt 2 random candidate levels to play
   and rate (👍/👎). Rating requires finishing or dying trying — votes come from
   actual play, not thumbnails.
4. **Rotate** — a scheduled job at 00:00 UTC picks the 3 top-rated candidates as
   tomorrow's gauntlet, credits the authors ("Level 2 by u/xyz"), and archives results.

### Hooks (mapped to judging categories)

- **Streak** — consecutive days with a completed gauntlet. Shown everywhere. (Retention)
- **Daily leaderboard + all-time featured-author count.** (Retention)
- **"My level got featured"** — author credit on the day's gauntlet + a builder
  scoreboard. (User Contributions)
- **Fresh content daily by construction** — the community is the level designer. (Hook)

## Screens (Phaser scenes)

- `Boot` / `Preloader` — asset load.
- `Hub` — today's gauntlet card, streak flame, Play / Build / Vote / Leaderboard buttons.
- `Run` — gameplay. HUD: timer, level x/3, deaths.
- `Results` — total time, rank, streak update, "vote on tomorrow's levels" CTA.
- `Editor` — grid tile editor with palette, test-play mode, submit (after proof-of-clear).
- `Vote` — play a candidate level, then 👍/👎, twice.
- `Leaderboard` — daily top times + all-time featured builders.

## Data model (redis)

```
day:current                    → "YYYYMMDD"
day:{d}                        → JSON { levelIds: [id,id,id] }
level:{id}                     → JSON { name, author, grid, authorTimeMs, createdAt }
queue:candidates               → zset levelId → net votes (from played ratings)
voted:{levelId}                → set of usernames (dedupe)
submitted:{d}                  → set of usernames (1 level/day limit)
lb:{d}                         → zset username → totalTimeMs (ascending)
user:{name}                    → JSON { streak, lastPlayedDay, featuredCount, bestRank }
```

## Server endpoints (Hono, `src/server/routes/api.ts`)

- `GET  /api/init` — today's gauntlet levels + user state (streak, played today?).
- `POST /api/run` — submit gauntlet total time → rank + streak update.
- `GET  /api/leaderboard?day=` — top N + your rank.
- `POST /api/level` — submit an authored level (validated + proof-of-clear time).
- `GET  /api/vote/deal` — get 2 candidate levels not yet voted by user.
- `POST /api/vote` — cast 👍/👎 on a played candidate.
- `POST /internal/scheduler/rotate-day` — daily cron: finalize votes, pick top 3, roll the day.

## Anti-abuse / integrity

- Server stamps times; client sends per-level splits + death count for sanity checks
  (reject times faster than author's clear − large margin, or impossible splits).
- One submission and one ranked run per user per day (practice runs unlimited).
- Level JSON validated server-side: grid bounds, exactly one start/flag, tile whitelist.

## Milestones

- **Jul 3–5** — core run gameplay + one hardcoded level, juicy feel (T3).
- **Jul 5–7** — editor + proof-of-clear + serialization (T4).
- **Jul 7–9** — server endpoints, daily rotation, voting, leaderboards (T5, T6).
- **Jul 9–12** — art/sound/polish, onboarding, mobile testing (T7).
- **Jul 12–15** — seed content, demo subreddit, README, video, Devpost submission (T8).

## Explicitly out of scope (hackathon)

Skins/cosmetics, seasons, level browser/search, comments on levels, replays/ghosts
(stretch: ghost of daily #1), moderation tools beyond validation.
