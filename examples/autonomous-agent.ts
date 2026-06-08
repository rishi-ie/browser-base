/**
 * Autonomous Agent Example
 * 
 * This example demonstrates how an AI coding agent would use browser-base
 * to accomplish user tasks autonomously. It shows:
 * - Task receipt and planning
 * - Browser automation to accomplish the task
 * - Context persistence across multiple operations
 * - Error handling and recovery
 * 
 * This is a simulation of how Claude, Cursor, or similar agents would
 * interact with the MCP server to perform real browser tasks.
 * 
 * Run with: npx tsx examples/autonomous-agent.ts
 */

import { SessionManager, resolveConfig } from '@browserbase/local';

const config = resolveConfig({
  browserContextDir: './browser-context',
  headless: true, // Set to false to see the browser
});

// ============================================
// Types
// ============================================

interface Task {
  id: string;
  description: string;
  context?: string;
}

interface TaskResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  steps: string[];
}

// ============================================
// Agent Implementation
// ============================================

class BrowserAgent {
  private sessionManager: SessionManager;
  private currentContext: string = 'default';

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  /**
   * Main agent loop: receive task, execute, return result
   */
  async executeTask(task: Task): Promise<TaskResult> {
    const result: TaskResult = {
      taskId: task.id,
      success: false,
      steps: [],
    };

    console.log(`\n[Agent] Received task: ${task.description}`);

    try {
      // Step 1: Ensure browser is running
      result.steps.push('Starting browser session');
      const context = task.context || this.currentContext;
      
      if (!this.sessionManager.getSession(context)) {
        await this.sessionManager.createSession(context);
      }
      result.steps.push(`Browser ready (context: ${context})`);

      // Step 2: Plan the approach based on task
      const approach = this.planApproach(task.description);
      result.steps.push(`Planned approach: ${approach.type}`);

      // Step 3: Execute based on approach
      switch (approach.type) {
        case 'navigate_and_extract':
          await this.handleNavigateAndExtract(task, approach, result);
          break;
        case 'navigate_and_act':
          await this.handleNavigateAndAct(task, approach, result);
          break;
        case 'observe_and_report':
          await this.handleObserveAndReport(task, approach, result);
          break;
        default:
          throw new Error(`Unknown approach type: ${approach.type}`);
      }

      result.success = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      result.steps.push(`Error: ${result.error}`);
    }

    return result;
  }

  /**
   * Plan how to approach the task based on its description
   */
  private planApproach(taskDescription: string): { type: string; details: any } {
    const lower = taskDescription.toLowerCase();

    if (lower.includes('extract') || lower.includes('get') || lower.includes('scrape')) {
      return { type: 'navigate_and_extract', details: {} };
    }

    if (lower.includes('click') || lower.includes('submit') || lower.includes('fill')) {
      return { type: 'navigate_and_act', details: {} };
    }

    if (lower.includes('find') || lower.includes('list') || lower.includes('check')) {
      return { type: 'observe_and_report', details: {} };
    }

    // Default to navigate and extract
    return { type: 'navigate_and_extract', details: {} };
  }

  /**
   * Handle tasks that navigate and extract data
   */
  private async handleNavigateAndExtract(
    task: Task,
    approach: { type: string; details: any },
    result: TaskResult
  ): Promise<void> {
    // Extract target URL from task
    const url = this.extractUrl(task.description);
    
    if (url) {
      result.steps.push(`Navigating to ${url}`);
      await this.sessionManager.navigate(this.currentContext, url);
    }

    // Extract the instruction for what data to get
    const extractInstruction = this.extractInstruction(
      task.description,
      ['extract', 'get', 'scrape', 'find', 'list']
    );

    result.steps.push(`Extracting: ${extractInstruction}`);
    const data = await this.sessionManager.extract(
      this.currentContext,
      extractInstruction
    );

    result.data = data;
    result.steps.push(`Extracted ${Object.keys(data).length} fields`);
  }

  /**
   * Handle tasks that involve interacting with the page
   */
  private async handleNavigateAndAct(
    task: Task,
    approach: { type: string; details: any },
    result: TaskResult
  ): Promise<void> {
    // Extract target URL
    const url = this.extractUrl(task.description);
    
    if (url) {
      result.steps.push(`Navigating to ${url}`);
      await this.sessionManager.navigate(this.currentContext, url);
    }

    // Extract the action to perform
    const action = this.extractAction(task.description);
    
    result.steps.push(`Performing action: ${action}`);
    await this.sessionManager.act(this.currentContext, action);

    result.steps.push('Action completed successfully');
  }

  /**
   * Handle tasks that observe and report
   */
  private async handleObserveAndReport(
    task: Task,
    approach: { type: string; details: any },
    result: TaskResult
  ): Promise<void> {
    // Extract what to observe
    const observeInstruction = this.extractInstruction(
      task.description,
      ['find', 'list', 'check', 'are there']
    );

    result.steps.push(`Observing: ${observeInstruction}`);
    const elements = await this.sessionManager.observe(
      this.currentContext,
      observeInstruction
    );

    result.data = { elements };
    result.steps.push(`Found ${elements.length} elements`);
  }

  /**
   * Switch to a different context
   */
  async switchContext(contextName: string): Promise<void> {
    this.currentContext = contextName;
    // Note: In real usage, you'd call use_context or start with the new context
    console.log(`[Agent] Switching to context: ${contextName}`);
  }

  /**
   * Clean up agent resources
   */
  async cleanup(): Promise<void> {
    console.log('[Agent] Cleaning up...');
    await this.sessionManager.closeSession(this.currentContext);
  }

  // ============================================
  // Helper Methods
  // ============================================

  private extractUrl(text: string): string | null {
    // Simple URL extraction
    const urlPattern = /https?:\/\/[^\s]+/;
    const match = text.match(urlPattern);
    return match ? match[0] : null;
  }

  private extractInstruction(
    text: string,
    prefixes: string[]
  ): string {
    // Extract the meaningful instruction from task description
    const lower = text.toLowerCase();
    
    for (const prefix of prefixes) {
      const idx = lower.indexOf(prefix);
      if (idx !== -1) {
        return text.substring(idx + prefix.length).trim();
      }
    }
    
    return text;
  }

  private extractAction(text: string): string {
    // Extract action from task description
    const actionVerbs = ['click', 'type', 'select', 'check', 'submit', 'fill'];
    
    const lower = text.toLowerCase();
    for (const verb of actionVerbs) {
      if (lower.includes(verb)) {
        // Return the part of the text containing the action
        const idx = lower.indexOf(verb);
        return text.substring(idx).trim();
      }
    }
    
    return text;
  }
}

// ============================================
// Example Tasks
// ============================================

const exampleTasks: Task[] = [
  {
    id: '1',
    description: 'Navigate to example.com and extract the page title and description',
    context: 'default',
  },
  {
    id: '2',
    description: 'Go to httpbin.org/html and list all the interactive elements on the page',
    context: 'default',
  },
  {
    id: '3',
    description: 'Visit github.com and check if there are any notification elements visible',
    context: 'github-logged-in',
  },
];

// ============================================
// Run Agent Demo
// ============================================

async function main() {
  console.log('=== Autonomous Agent Demo ===\n');
  console.log('This simulates how an AI coding agent uses browser-base');
  console.log('to accomplish user tasks autonomously.\n');

  const sessionManager = new SessionManager(config);
  const agent = new BrowserAgent(sessionManager);

  // Process each example task
  for (const task of exampleTasks) {
    console.log('─'.repeat(50));
    
    const result = await agent.executeTask(task);
    
    console.log('\nResult:');
    console.log(`  Task ID: ${result.taskId}`);
    console.log(`  Success: ${result.success}`);
    
    if (result.steps.length > 0) {
      console.log('  Steps:');
      result.steps.forEach((step) => {
        console.log(`    - ${step}`);
      });
    }
    
    if (result.data) {
      console.log('  Data:');
      console.log(`    ${JSON.stringify(result.data, null, 2).split('\n').join('\n    ')}`);
    }
    
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    
    console.log('');
  }

  // Clean up
  await agent.cleanup();

  console.log('─'.repeat(50));
  console.log('\n=== Demo Complete ===');
}

// ============================================
// MCP Protocol Flow
// ============================================

/**
 * Shows the actual MCP protocol flow for an autonomous agent
 */
async function showMcpFlow() {
  console.log('\n=== MCP Protocol Flow for Autonomous Agent ===\n');

  console.log(`
  When an AI coding agent receives a user task, the flow is:
  
  1. User sends task to agent:
     "Go to github.com and list my repositories"
  
  2. Agent decides to use browser-base MCP tools:
  
     Tool: start
     {
       "name": "start",
       "arguments": { "context": "github-logged-in" }
     }
     --> Response: { "session": "github-logged-in", "status": "started" }
  
     Tool: navigate
     {
       "name": "navigate",
       "arguments": { "url": "https://github.com" }
     }
     --> Response: { "url": "https://github.com", "status": "navigated" }
  
     Tool: observe
     {
       "name": "observe",
       "arguments": { "instruction": "find the repository list or links" }
     }
     --> Response: { "elements": [...] }
  
     Tool: extract
     {
       "name": "extract",
       "arguments": { "instruction": "get all repository names and descriptions" }
     }
     --> Response: { "data": { "repositories": [...] } }
  
  3. Agent synthesizes results and reports to user:
     "You have 12 repositories. The main ones are:
      - browser-base (personal browser automation)
      - my-project (latest work)"
  
  4. Session remains open for next task (context persists)
  
  5. Later, agent can use the same session:
     Tool: navigate
     {
       "name": "navigate",
       "arguments": { "url": "https://github.com/settings/tokens" }
     }
     --> Already logged in, no need to authenticate again!
  `);
}

// ============================================
// Context Persistence Example
// ============================================

/**
 * Shows how context persistence works across multiple sessions
 */
async function showContextPersistence() {
  console.log('\n=== Context Persistence Example ===\n');

  console.log(`
  Session 1 (Day 1):
  -----------------
  - Create context "github-work"
  - Open Chrome with that profile
  - User logs into GitHub manually
  - Close Chrome (cookies saved)
  
  Session 2 (Day 2):
  -----------------
  - Agent calls: start({ context: "github-work" })
  - Chrome opens with saved cookies
  - Navigate to github.com
  - Already logged in! No re-authentication needed.
  
  Session 3 (Day 3):
  -----------------
  - Same as Session 2
  - Context persists indefinitely
  
  This is the key value of browser-base for coding agents:
  - Login once
  - Reuse forever
  - No per-task authentication overhead
  `);
}

// Run the main demo
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

// Uncomment to see additional flows:
// showMcpFlow();
// showContextPersistence();

export { BrowserAgent, main, showMcpFlow, showContextPersistence };