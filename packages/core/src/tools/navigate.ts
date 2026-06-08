import { z } from 'zod';
import { defineTool, ok, err } from './tool.js';
import type { SessionManager } from '../sessionManager.js';

const NavigateSchema = z.object({
  url: z.string().describe('URL to navigate to'),
});

export function createNavigateTool() {
  return defineTool({
    name: 'navigate',
    description: 'Navigate to a URL in the browser',
    schema: NavigateSchema,
    handler: async (sessionManager: SessionManager, params: z.infer<typeof NavigateSchema>) => {
      if (!sessionManager.isActive()) {
        return err('No browser session running. Use the start tool first.');
      }

      try {
        await sessionManager.navigate(params.url);
        return ok({ url: params.url, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return err(`Navigation failed: ${message}`);
      }
    },
  });
}

export const navigateTool = createNavigateTool();