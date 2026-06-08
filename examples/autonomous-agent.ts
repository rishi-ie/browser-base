#!/usr/bin/env tsx
/**
 * Autonomous agent example for browser-base.
 *
 * This example simulates how an AI coding agent (Claude, Cursor, etc.)
 * drives browser-base to accomplish a multi-step task. It demonstrates
 * the canonical observe -> act -> extract loop and shows how to keep
 * session state across many operations without re-authenticating.
 *
 * The example runs through three example tasks against public, no-login
 * pages so it can be exercised end-to-end without any setup beyond
 * `OPENAI_API_KEY`.
 *
 * To run this example:
 *   1. Make sure a `default` context exists:
 *        npx browse-local context create default
 *   2. Set your OpenAI API key:
 *        export OPENAI_API_KEY=sk-...
 *   3. Run the example:
 *        npx tsx examples/autonomous-agent.ts
 *
 * In a real deployment the agent would not hardcode tasks — it would
 * receive them from a user message, decide what to do next after each
 * observation, and call back into the Browser as needed.
 */

import { Browser, resolveConfig } from '@browserbase/local';
import type { Action, ActResult } from '@browserbase/local';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Task {
  id: string;
  description: string;
  context?: string;
}

interface TaskStep {
  description: string;
  ok: boolean;
}

interface TaskResult {
  taskId: string;
  success: boolean;
  steps: TaskStep[];
  data?: unknown;
  error?: string;
}

// ---------------------------------------------------------------------------
// BrowserAgent
//
// Thin wrapper around `Browser` that adds task bookkeeping and the
// observe/act/extract loop a coding agent typically uses. In a real
// agent the LLM would be making the planning decisions between calls;
// here we hardcode them so the example is deterministic.
// ---------------------------------------------------------------------------

class BrowserAgent {
  private browser: Browser;
  private currentContext: string;

  constructor(browser: Browser, defaultContext = 'default') {
    this.browser = browser;
    this.currentContext = defaultContext;
  }

  /**
   * Execute a task end-to-end and return a structured result.
   */
  async executeTask(task: Task): Promise<TaskResult> {
    const result: TaskResult = {
      taskId: task.id,
      success: false,
      steps: [],
    };

    try {
      // Step 1: Make sure the right context is loaded. We don't restart
      // the session if the requested context is already active, because
      // restarting would throw away cookies and any in-progress form
      // state.
      const targetContext = task.context ?? this.currentContext;
      if (!this.browser.isActive()) {
        await this.browser.start(targetContext);
        this.currentContext = targetContext;
        result.steps.push({ description: `Started session (${targetContext})`, ok: true });
      } else if (this.browser.getCurrentContext() !== targetContext) {
        await this.browser.useContext(targetContext);
        this.currentContext = targetContext;
        result.steps.push({ description: `Switched to context (${targetContext})`, ok: true });
      } else {
        result.steps.push({ description: `Reusing context (${targetContext})`, ok: true });
      }

      // Step 2: Run the observe/act/extract loop. In a real agent the
      // LLM picks the next action based on the most recent observation;
      // we drive a small fixed script so the example is reproducible.
      const loop = this.planLoop(task.description);
      for (const step of loop) {
        await this.runStep(step, result);
      }

      result.success = true;
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      result.steps.push({ description: `Error: ${result.error}`, ok: false });
    }

    return result;
  }

  /**
   * Decompose a task description into a small script of operations.
   * Real agents would let the LLM produce this; we hardcode for clarity.
   */
  private planLoop(description: string): Array<{
    kind: 'navigate' | 'observe' | 'act' | 'extract';
    payload: string;
  }> {
    const lower = description.toLowerCase();

    // "Go to <url> and <verb> ..."
    const url = description.match(/https?:\/\/\S+/)?.[0];

    if (url && lower.includes('extract')) {
      return [
        { kind: 'navigate', payload: url },
        { kind: 'observe', payload: 'find the main content area' },
        { kind: 'extract', payload: description.replace(/^.*?(extract|get|scrape)\s*/i, '$1 ') },
      ];
    }

    if (url && lower.includes('click')) {
      return [
        { kind: 'navigate', payload: url },
        { kind: 'observe', payload: 'find the element to interact with' },
        { kind: 'act', payload: description.replace(/^.*?(click|type|fill|select)\s*/i, '$1 ') },
        { kind: 'extract', payload: 'describe what changed on the page' },
      ];
    }

    if (url) {
      return [
        { kind: 'navigate', payload: url },
        { kind: 'observe', payload: 'find the main interactive elements' },
        { kind: 'extract', payload: 'summarize what is on the page' },
      ];
    }

    // No URL — just observe and extract on the current page.
    return [
      { kind: 'observe', payload: 'find the main content' },
      { kind: 'extract', payload: description },
    ];
  }

  /**
   * Run a single step of the plan and append it to the result.
   */
  private async runStep(
    step: { kind: 'navigate' | 'observe' | 'act' | 'extract'; payload: string },
    result: TaskResult,
  ): Promise<void> {
    switch (step.kind) {
      case 'navigate': {
        await this.browser.navigate(step.payload);
        result.steps.push({ description: `Navigated to ${step.payload}`, ok: true });
        return;
      }
      case 'observe': {
        const elements: Action[] = await this.browser.observe(step.payload);
        result.steps.push({
          description: `Observed ${elements.length} elements (${step.payload})`,
          ok: true,
        });
        return;
      }
      case 'act': {
        const r: ActResult = await this.browser.act(step.payload);
        result.steps.push({
          description: `Act: ${step.payload} -> ${r.success ? 'ok' : 'failed'}`,
          ok: r.success,
        });
        return;
      }
      case 'extract': {
        const data = await this.browser.extract(step.payload);
        result.data = data;
        result.steps.push({
          description: `Extracted data (${step.payload})`,
          ok: true,
        });
        return;
      }
    }
  }

  /**
   * End the underlying browser session. Safe to call multiple times.
   */
  async cleanup(): Promise<void> {
    await this.browser.end();
  }
}

// ---------------------------------------------------------------------------
// Example tasks
// ---------------------------------------------------------------------------

const exampleTasks: Task[] = [
  {
    id: '1',
    description: 'Go to https://example.com and extract the page title and main heading',
  },
  {
    id: '2',
    description: 'Navigate to https://example.com and click the "More information..." link',
  },
  {
    id: '3',
    description: 'Visit https://example.com and summarize what is on the page',
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Autonomous Agent Demo ===');
  console.log('Simulating how an AI coding agent uses browser-base.\n');

  // Configure and create a Browser. The agent reuses this single
  // instance across all tasks so cookies, logins, and page state
  // persist between steps (and between tasks, if the contexts match).
  const config = resolveConfig({
    contextDir: './browser-context',
    model: 'openai/gpt-4.1-mini',
  });
  const browser = new Browser(config);
  const agent = new BrowserAgent(browser);

  for (const task of exampleTasks) {
    console.log('-'.repeat(60));
    console.log(`Task ${task.id}: ${task.description}`);

    const result = await agent.executeTask(task);

    console.log(`  Success: ${result.success}`);
    console.log('  Steps:');
    for (const step of result.steps) {
      console.log(`    ${step.ok ? '[ok]' : '[!!]'} ${step.description}`);
    }
    if (result.data !== undefined) {
      console.log(`  Data: ${JSON.stringify(result.data)}`);
    }
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    console.log('');
  }

  await agent.cleanup();
  console.log('-'.repeat(60));
  console.log('Done.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
