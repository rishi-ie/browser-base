/**
 * Context Management Example
 * 
 * This example demonstrates how to:
 * - List available browser contexts
 * - Create new contexts
 * - Switch between contexts
 * - Use contexts for persistent logins
 * 
 * Run with: npx tsx examples/context-management.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { SessionManager, resolveConfig } from '@browserbase/local';

const config = resolveConfig({
  browserContextDir: './browser-context',
  headless: true,
});

// ============================================
// Utility Functions
// ============================================

/**
 * List all available contexts
 */
function listContexts(): string[] {
  const contextDir = config.browserContextDir;
  
  if (!fs.existsSync(contextDir)) {
    return [];
  }
  
  return fs.readdirSync(contextDir)
    .filter((name) => {
      const fullPath = path.join(contextDir, name);
      return fs.statSync(fullPath).isDirectory();
    });
}

/**
 * Create a new context directory
 */
function createContext(name: string): string {
  const contextDir = path.join(config.browserContextDir, name);
  
  if (fs.existsSync(contextDir)) {
    throw new Error(`Context "${name}" already exists at ${contextDir}`);
  }
  
  fs.mkdirSync(contextDir, { recursive: true });
  return contextDir;
}

/**
 * Check if a context exists
 */
function contextExists(name: string): boolean {
  const contextDir = path.join(config.browserContextDir, name);
  return fs.existsSync(contextDir);
}

// ============================================
// Main Demo
// ============================================

async function main() {
  console.log('=== Browser Base Context Management Demo ===\n');
  
  const sessionManager = new SessionManager(config);

  // ============================================
  // PART 1: List Available Contexts
  // ============================================
  console.log('1. Listing available contexts...');
  
  const contexts = listContexts();
  
  if (contexts.length === 0) {
    console.log('   No contexts found. Let\'s create one!\n');
  } else {
    console.log(`   Found ${contexts.length} context(s):`);
    contexts.forEach((ctx) => {
      console.log(`   - ${ctx}`);
    });
    console.log('');
  }

  // ============================================
  // PART 2: Create a New Context
  // ============================================
  console.log('2. Creating a new context...');
  
  const newContextName = 'demo-context';
  
  if (!contextExists(newContextName)) {
    const contextPath = createContext(newContextName);
    console.log(`   Created: ${newContextName}`);
    console.log(`   Path: ${contextPath}`);
  } else {
    console.log(`   Context "${newContextName}" already exists`);
  }
  console.log('');

  // ============================================
  // PART 3: Start Sessions with Different Contexts
  // ============================================
  console.log('3. Starting sessions with different contexts...');
  
  // Start with the default context
  console.log('   Starting default session...');
  const defaultSession = await sessionManager.createSession('default');
  console.log(`   Default session: ${defaultSession.id}`);
  console.log(`   Context dir: ${defaultSession.contextDir}`);
  
  // Start with our new context
  console.log('   Starting demo-context session...');
  const demoSession = await sessionManager.createSession(newContextName);
  console.log(`   Demo session: ${demoSession.id}`);
  console.log(`   Context dir: ${demoSession.contextDir}\n`);

  // ============================================
  // PART 4: Use Context-Specific Navigation
  // ============================================
  console.log('4. Using context-specific navigation...');
  
  // Navigate in default context
  console.log('   Navigating in default context...');
  await sessionManager.navigate('default', 'https://example.com');
  console.log('   Navigated to example.com in default context');
  
  // Navigate in demo context
  console.log('   Navigating in demo-context...');
  await sessionManager.navigate(newContextName, 'https://httpbin.org/html');
  console.log('   Navigated to httpbin.org in demo-context\n');

  // ============================================
  // PART 5: Switch Between Contexts
  // ============================================
  console.log('5. Demonstrating context switching...');
  
  // Get current session info
  const currentSession = sessionManager.getSession('default');
  console.log(`   Current session: ${currentSession?.id || 'none'}`);
  
  // Switch to demo context
  console.log('   Switching to demo-context...');
  await sessionManager.closeSession('default');
  await sessionManager.createSession(newContextName);
  console.log('   Switched to demo-context');
  
  // Verify the switch
  const afterSwitch = sessionManager.getSession(newContextName);
  console.log(`   Current session: ${afterSwitch?.id || 'none'}\n`);

  // ============================================
  // PART 6: Context for Pre-Login
  // ============================================
  console.log('6. Context usage for pre-logged-in sessions...');
  
  console.log(`
   The real power of contexts is persistent logins:
   
   1. Create a context:
      browse-local context create github-work
   
   2. Open Chrome with that profile:
      google-chrome --user-data-dir=./browser-context/github-work
   
   3. Log into GitHub manually
   
   4. Close Chrome
   
   5. Now agents can use "github-work" context and
      will already be logged in!
   
   This avoids re-authentication for every task.
  `);

  // ============================================
  // PART 7: Cleanup
  // ============================================
  console.log('7. Cleaning up demo session...');
  
  await sessionManager.closeSession(newContextName);
  console.log('   Session closed\n');

  console.log('=== Demo Complete ===');
  console.log(`
  Useful CLI commands for context management:
  
  - List contexts: browse-local contexts
  - Create context: browse-local context create <name>
  - Delete context: rm -rf browser-context/<name>
  `);
}

// ============================================
// MCP Tool Examples
// ============================================

/**
 * These examples show how context operations work via MCP tools
 */
async function mcpContextExamples() {
  console.log('\n=== MCP Tool Examples for Contexts ===\n');

  // Tool: start with context
  // {
  //   "name": "start",
  //   "arguments": { "context": "github-work" }
  // }

  // Tool: use_context (switch contexts)
  // {
  //   "name": "use_context",
  //   "arguments": { "context": "gmail-personal" }
  // }

  // Tool: navigate with context
  // {
  //   "name": "navigate",
  //   "arguments": {
  //     "url": "https://github.com/settings/tokens",
  //     "context": "github-work"
  //   }
  // }

  // Tool: act with context
  // {
  //   "name": "act",
  //   "arguments": {
  //     "action": "click the new token button",
  //     "context": "github-work"
  //   }
  // }

  console.log('MCP tools for context management:');
  console.log('- start (with context parameter)');
  console.log('- use_context (to switch)');
  console.log('- navigate (with optional context)');
  console.log('- act (with optional context)');
  console.log('- observe (with optional context)');
  console.log('- extract (with optional context)');
  console.log('- end (with optional context)');
}

// ============================================
// Manual Login Workflow
// ============================================

/**
 * Shows how to pre-login to a site manually
 */
async function manualLoginWorkflow() {
  console.log('\n=== Manual Login Workflow ===\n');

  console.log(`
  Step-by-step: Pre-login to GitHub in a context
  
  1. Create the context:
     $ browse-local context create github-work
  
  2. Launch Chrome with the context profile:
     $ "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \\
       --user-data-dir="$(pwd)/browser-context/github-work"
  
  3. In Chrome, navigate to github.com and log in:
     - Go to github.com
     - Click "Sign in"
     - Enter credentials
     - Complete 2FA if enabled
     - Verify you're logged in (check your profile)
  
  4. Close Chrome completely (all windows)
  
  5. The context is now ready for agents:
     - start({context: "github-work"})
     - navigate({url: "https://github.com"})  // Already logged in!
  `);

  // Example: Use the logged-in context
  console.log('Example MCP calls with the logged-in context:\n');
  
  console.log('Start session:');
  console.log('{ "name": "start", "arguments": { "context": "github-work" } }');
  
  console.log('\nNavigate (no login needed):');
  console.log('{ "name": "navigate", "arguments": { "url": "https://github.com" } }');
  
  console.log('\nCheck user info (already authenticated):');
  console.log('{ "name": "extract", "arguments": { "instruction": "get the username from the page" } }');
}

// Run the examples
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

// Uncomment to see additional examples:
// mcpContextExamples();
// manualLoginWorkflow();

export { main, mcpContextExamples, manualLoginWorkflow };