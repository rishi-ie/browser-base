#!/usr/bin/env tsx
/**
 * Context management example for browser-base.
 *
 * A "context" in browser-base is just a named Chrome user profile directory
 * on disk. Each context persists cookies, local storage, and other state
 * between sessions, which is what makes persistent logins possible.
 *
 * This example shows:
 * - Listing the contexts that already exist on disk
 * - Creating a new context (the directory that holds a Chrome profile)
 * - Starting a session with a specific context
 * - Switching to a different context at runtime
 * - The recommended workflow for pre-logging-in to a site
 *
 * To run this example:
 *   1. Make sure the CLI is available (it's part of this monorepo):
 *        npx browse-local --help
 *   2. Set your OpenAI API key:
 *        export OPENAI_API_KEY=sk-...
 *   3. Run the example:
 *        npx tsx examples/context-management.ts
 *
 * The example will create a couple of contexts under `./browser-context/`
 * and exercise the full switch/inspect lifecycle.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Browser, resolveConfig } from '@browserbase/local';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a context directory by invoking the bundled CLI.
 * Equivalent to running `npx browse-local context create <name>` by hand.
 */
function createContext(contextDir: string, name: string): void {
  const contextPath = path.join(contextDir, name);
  if (fs.existsSync(contextPath)) {
    console.log(`  Context '${name}' already exists at ${contextPath}`);
    return;
  }
  execSync(`npx browse-local context create ${name}`, {
    stdio: 'inherit',
    env: { ...process.env, BROWSER_BASE_CONTEXT_DIR: contextDir },
  });
}

/**
 * Pretty-print the list of contexts in the context directory.
 */
function printContexts(contextDir: string): void {
  if (!fs.existsSync(contextDir)) {
    console.log('  (no contexts yet)');
    return;
  }
  const entries = fs
    .readdirSync(contextDir)
    .filter((name) => {
      if (name.startsWith('.')) return false;
      return fs.statSync(path.join(contextDir, name)).isDirectory();
    });
  if (entries.length === 0) {
    console.log('  (no contexts yet)');
    return;
  }
  for (const name of entries) {
    console.log(`  - ${name}`);
  }
}

// ---------------------------------------------------------------------------
// Main demo
// ---------------------------------------------------------------------------

async function main() {
  const contextDir = './browser-context';

  // -------------------------------------------------------------------------
  // Step 1: List available contexts.
  //
  // `getAvailableContexts` is a static helper that just reads the context
  // directory and returns the names of every subdirectory (skipping hidden
  // ones). It does NOT require a running browser session.
  // -------------------------------------------------------------------------
  console.log('1. Listing available contexts...');
  printContexts(contextDir);
  console.log('');

  // -------------------------------------------------------------------------
  // Step 2: Create new contexts.
  //
  // A context is just a directory. We create them via the bundled CLI,
  // which is what you'll typically use. Once created, the directory is
  // ready to back a Chrome user profile.
  // -------------------------------------------------------------------------
  console.log('2. Creating contexts...');
  createContext(contextDir, 'github-work');
  createContext(contextDir, 'gmail-personal');
  console.log('');

  console.log('Contexts on disk:');
  printContexts(contextDir);
  console.log('');

  // -------------------------------------------------------------------------
  // Step 3: Configure the Browser and start a session.
  //
  // We point `contextDir` at the directory we just populated. The `start`
  // method takes a context name as its only argument and returns a
  // `SessionInfo` object. The context directory must already exist;
  // `start` will throw if it doesn't.
  // -------------------------------------------------------------------------
  const config = resolveConfig({ contextDir });
  const browser = new Browser(config);

  console.log('3. Starting session with the "github-work" context...');
  const session = await browser.start('github-work');
  console.log(`  Active context: ${browser.getCurrentContext()}`);
  console.log(`  Session:        ${session.sessionId}`);
  console.log(`  isActive:       ${browser.isActive()}`);
  console.log('');

  // -------------------------------------------------------------------------
  // Step 4: List available contexts at runtime.
  //
  // `Browser.getAvailableContexts()` is the instance method — it just
  // delegates to the same static helper, so you can call it any time
  // (with or without a running session).
  // -------------------------------------------------------------------------
  console.log('4. Asking the Browser instance for available contexts...');
  const contexts = browser.getAvailableContexts();
  console.log(`  Found: ${contexts.join(', ')}`);
  console.log('');

  // -------------------------------------------------------------------------
  // Step 5: Switch contexts at runtime.
  //
  // `useContext` ends the current session (if any) and starts a new one
  // with the requested context. It's the right call when an agent needs
  // to act as a different identity (e.g. work account vs personal
  // account) without restarting the program.
  //
  // `useContext` returns the new `SessionInfo` (debug/CDP URLs, etc.),
  // so you don't need a separate `start` call afterwards.
  // -------------------------------------------------------------------------
  console.log('5. Switching to "gmail-personal" via useContext...');
  const switched = await browser.useContext('gmail-personal');
  console.log(`  Active context: ${browser.getCurrentContext()}`);
  console.log(`  Debug URL:      ${browser.getDebugUrl()}`);
  console.log(`  New session:    ${switched.sessionId}`);
  console.log('');

  // -------------------------------------------------------------------------
  // Step 6: Switch back.
  // -------------------------------------------------------------------------
  console.log('6. Switching back to "github-work"...');
  await browser.useContext('github-work');
  console.log(`  Active context: ${browser.getCurrentContext()}`);
  console.log('');

  // -------------------------------------------------------------------------
  // Step 7: End the session.
  // -------------------------------------------------------------------------
  console.log('7. Ending session...');
  await browser.end();
  console.log(`  isActive: ${browser.isActive()}`);
  console.log('  Done.');

  // -------------------------------------------------------------------------
  // Step 8: The recommended pre-login workflow.
  //
  // This is the part where you turn an empty context into one that
  // already has the cookies you need. We can't drive the actual browser
  // GUI from this example, but the steps are:
  //
  //   1. Create the context (already done above).
  //   2. Launch Chrome pointed at that user-data-dir.
  //   3. Log in to the site by hand (including any 2FA).
  //   4. Quit Chrome completely.
  //   5. Now any agent that calls `browser.start('<name>')` inherits
  //      those cookies and starts already logged in.
  // -------------------------------------------------------------------------
  console.log('\n8. Pre-login workflow (manual steps):');
  console.log('   For context "github-work", the path is:');
  console.log(`     ${path.resolve(contextDir, 'github-work')}`);
  console.log('   Launch Chrome with that profile:');
  console.log(
    `     "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ` +
      `--user-data-dir="${path.resolve(contextDir, 'github-work')}"`
  );
  console.log('   Then log in to github.com in that Chrome window and quit.');
  console.log(
    '   After that, an agent can call `browser.start("github-work")` and\n' +
      '   navigate to https://github.com already authenticated.'
  );
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
