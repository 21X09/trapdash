import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { seedBuiltinLevels } from '../core/builtins';
import { createPost } from '../core/post';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    const input = await c.req.json<OnAppInstallRequest>();

    // Seed the starter levels and today's first gauntlet before the post
    // exists so the very first /api/init already has something to serve.
    await seedBuiltinLevels();
    const post = await createPost();

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Seeded starter gauntlet and created post ${post.id} in subreddit ${context.subredditName} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error(`Error installing app: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to install app',
      },
      400
    );
  }
});
