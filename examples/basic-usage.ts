#!/usr/bin/env tsx
/**
 * Basic usage example for browser-base.
 *
 * This example shows the full lifecycle of a browser session:
 * - Configuring the Browser with a context directory
 * - Starting a session (which uses a named Chrome profile)
 * - Navigating to a URL
 * - Performing an action in natural language
 * - Observing interactive elements on the page
 * - Extracting structured data
 * - Ending the session cleanly
 *
 * To run this example:
 *   1. Create a context (a directory that holds a Chrome user profile):
 *        npx browse-local context create default
 *   2. Set your OpenAI API key (the default model is `openai/gpt-4.1-mini`):
 *        export OPENAI_API_KEY=sk-...
 *   3. Run the example:
 *        npx tsx examples/basic-usage.ts
 *
 * The first time you start a context, you'll want to log in to whatever
 * sites you need manually. See `context-management.ts` for details.
 */

import { Browser, resolveConfig } from '@browserbase/local';

async function main() {
  // -------------------------------------------------------------------------
  // Step 1: Create a Browser instance.
  //
  // `resolveConfig` merges your options with environment variables and
  // defaults. The only required field is `contextDir` — the directory where
  // Chrome user profiles (contexts) live.
  // -------------------------------------------------------------------------
  const config = resolveConfig({
    contextDir: './browser-context',
    model: 'openai/gpt-4.1-mini',
  });
  const browser = new Browser(config);

  // -------------------------------------------------------------------------
  // Step 2: Start a session.
  //
  // The argument is the context name. If you omit it, browser-base uses
  // `config.defaultContext` (which defaults to "default"). The context
  // directory must already exist on disk — create it first with
  // `browse-local context create <name>`.
  //
  // `start` returns a `SessionInfo` object with debug/CDP URLs you can use
  // to inspect the running browser.
  // -------------------------------------------------------------------------
  console.log('Starting browser session...');
  const session = await browser.start('default');
  console.log(`  Context:     ${session.context}`);
  console.log(`  Debug URL:   ${session.debugUrl}`);
  console.log(`  CDP URL:     ${session.cdpUrl}`);

  // -------------------------------------------------------------------------
  // Step 3: Navigate to a URL.
  //
  // `navigate` takes a single string argument and loads it in the active
  // page of the browser context.
  // -------------------------------------------------------------------------
  console.log('\nNavigating to example.com...');
  await browser.navigate('https://example.com');

  // -------------------------------------------------------------------------
  // Step 4: Perform an action in natural language.
  //
  // `act` takes a plain-English description of what you want to do — click,
  // type, select, etc. — and uses the LLM to find the right element and
  // drive the browser. The result reports whether the action succeeded.
  // -------------------------------------------------------------------------
  console.log('\nPerforming action: click the "More information..." link...');
  const actResult = await browser.act('click the "More information..." link');
  console.log(`  Success:     ${actResult.success}`);
  console.log(`  Message:     ${actResult.message}`);
  console.log(`  Description: ${actResult.actionDescription}`);
  if (actResult.cacheStatus) {
    console.log(`  Cache:       ${actResult.cacheStatus}`);
  }

  // -------------------------------------------------------------------------
  // Step 5: Observe elements on the page.
  //
  // `observe` returns a list of `Action` objects (selector + description)
  // for elements that match the optional instruction. With no instruction,
  // it returns all interactive elements on the current page.
  // -------------------------------------------------------------------------
  console.log('\nObserving page elements...');
  const elements = await browser.observe('find all links on the page');
  console.log(`  Found ${elements.length} actionable elements:`);
  elements.slice(0, 3).forEach((el, i) => {
    console.log(`    ${i + 1}. ${el.description}  [${el.selector}]`);
  });

  // -------------------------------------------------------------------------
  // Step 6: Extract structured data.
  //
  // `extract` returns whatever the LLM pulls off the page that matches
  // your instruction. The second argument is an optional Zod-style schema
  // if you want typed output (see `extract`'s full signature).
  // -------------------------------------------------------------------------
  console.log('\nExtracting page data...');
  const data = await browser.extract('get the page title and main heading');
  console.log(`  Data: ${JSON.stringify(data)}`);

  // -------------------------------------------------------------------------
  // Step 7: End the session.
  //
  // `end` closes Chrome and tears down the Stagehand client. It's
  // idempotent — calling it twice is a no-op.
  // -------------------------------------------------------------------------
  console.log('\nEnding session...');
  await browser.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
