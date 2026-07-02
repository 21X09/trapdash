import { Hono } from 'hono';
import { todayKey } from '../core/days';
import { rotateToDay } from '../core/rotation';
import { getDayLevelIds } from '../core/state';

type SchedulerResponse = {
  status: 'success' | 'error';
  message: string;
};

export const scheduler = new Hono();

/**
 * Daily cron (00:00 UTC, wired in devvit.json): finalize votes and roll the
 * gauntlet over to the new day. Idempotent — a day that already has levels
 * is never rotated again.
 */
scheduler.post('/rotate-day', async (c) => {
  try {
    const day = todayKey();
    const existing = await getDayLevelIds(day);
    if (existing) {
      return c.json<SchedulerResponse>(
        { status: 'success', message: `day ${day} already rotated` },
        200
      );
    }

    const levelIds = await rotateToDay(day);
    return c.json<SchedulerResponse>(
      { status: 'success', message: `rotated to ${day}: ${levelIds.join(', ')}` },
      200
    );
  } catch (error) {
    console.error('Scheduler rotate-day error:', error);
    return c.json<SchedulerResponse>(
      { status: 'error', message: 'failed to rotate day' },
      400
    );
  }
});
