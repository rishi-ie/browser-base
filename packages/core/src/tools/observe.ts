import { z } from 'zod';
import { defineTool, ok, err } from './tool.js';
import type { SessionManager } from '../sessionManager.js';

const ObserveSchema = z.object({
  instruction: z.string().optional().describe('What to look for on the page'),
});

export function createObserveTool() {
  return defineTool({
    name: 'observe',
    description: 'Observe and identify elements on the current page',
    schema: ObserveSchema,
    handler: async (sessionManager: SessionManager, params: z.infer<typeof ObserveSchema>) => {
      if (!sessionManager.isActive()) {
        return err('No browser session running. Use the start tool first.');
      }

      try {
        const actions = await sessionManager.observe(params.instruction);
        return ok(actions);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return err(`Observation failed: ${message}`);
      }
    },
  });
}

export const observeTool = createObserveTool();