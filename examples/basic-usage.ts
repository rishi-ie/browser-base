/**
 * Basic Usage Example
 * 
 * This example demonstrates the fundamental browser-base workflow:
 * - Start a browser session
 * - Navigate to a URL
 * - Act on elements (click, type)
 * - Observe elements on the page
 * - Extract structured data
 * - End the session
 * 
 * Run with: npx tsx examples/basic-usage.ts
 * Or compile and run: npx tsc && node examples/basic-usage.js
 */

import { SessionManager, resolveConfig } from '@browserbase/local';

// Initialize configuration
const config = resolveConfig({
  browserContextDir: './browser-context',
  headless: true, // Set to false to see the browser
});
const sessionManager = new SessionManager(config);

async function main() {
  console.log('=== Browser Base Basic Usage Demo ===\n');

  // ============================================
  // STEP 1: Start a browser session
  // ============================================
  console.log('1. Starting browser session...');
  
  const session = await sessionManager.createSession('default');
  console.log(`   Session started: ${session.id}`);
  console.log(`   Context directory: ${session.contextDir}\n`);

  // ============================================
  // STEP 2: Navigate to a URL
  // ============================================
  console.log('2. Navigating to example.com...');
  
  await sessionManager.navigate('default', 'https://example.com');
  console.log('   Navigation complete\n');

  // ============================================
  // STEP 3: Extract page information
  // ============================================
  console.log('3. Extracting page data...');
  
  interface PageData {
    title: string;
    heading: string;
    description: string;
  }
  
  const pageData = await sessionManager.extract<PageData>(
    'default',
    'Extract the page title, main heading, and the description paragraph'
  );
  
  console.log('   Extracted data:');
  console.log(`   - Title: ${pageData.title}`);
  console.log(`   - Heading: ${pageData.heading}`);
  console.log(`   - Description: ${pageData.description}\n`);

  // ============================================
  // STEP 4: Observe elements
  // ============================================
  console.log('4. Observing page elements...');
  
  const elements = await sessionManager.observe(
    'default',
    'find any links or interactive elements'
  );
  
  console.log(`   Found ${elements.length} interactive elements`);
  elements.forEach((el: any, i: number) => {
    console.log(`   ${i + 1}. ${el.role || 'element'}: ${el.name || el.description || 'unknown'}`);
  });
  console.log('');

  // ============================================
  // STEP 5: Navigate to a form page
  // ============================================
  console.log('5. Demonstrating act (simulated)...');
  
  // In a real scenario, you'd navigate to a page with a form
  // and then use act to interact with it:
  // 
  // await sessionManager.navigate('default', 'https://www.example.com/contact');
  // await sessionManager.act('default', 'click the name input field');
  // await sessionManager.act('default', 'type "John Doe" in the name field');
  // await sessionManager.act('default', 'click the submit button');
  
  console.log('   (In a real scenario, you would:');
  console.log('   - Navigate to a form page');
  console.log('   - Click input fields');
  console.log('   - Type text into fields');
  console.log('   - Submit forms)\n');

  // ============================================
  // STEP 6: Extract structured data
  // ============================================
  console.log('6. Extracting structured data...');
  
  // Example: Extract data from a table or list
  // const items = await sessionManager.extract<Array<{name: string, price: string}>>(
  //   'default',
  //   'extract all product names and prices from the list'
  // );
  
  console.log('   (In a real scenario, you would extract:');
  console.log('   - Table rows');
  console.log('   - Product listings');
  console.log('   - User profiles');
  console.log('   - Any structured content)\n');

  // ============================================
  // STEP 7: End the session
  // ============================================
  console.log('7. Closing browser session...');
  
  await sessionManager.closeSession('default');
  console.log('   Session closed\n');

  console.log('=== Demo Complete ===');
}

// Alternative: MCP Protocol Example
// This shows how you'd use browser-base as an MCP server
async function mcpExample() {
  console.log('\n=== MCP Server Usage ===\n');
  
  // When used as MCP server, the tools are called via JSON-RPC:
  // 
  // Tool: start
  // {
  //   "name": "start",
  //   "arguments": { "context": "default" }
  // }
  // 
  // Tool: navigate
  // {
  //   "name": "navigate",
  //   "arguments": { "url": "https://example.com" }
  // }
  // 
  // Tool: act
  // {
  //   "name": "act",
  //   "arguments": { "action": "click the 'Learn More' button" }
  // }
  // 
  // Tool: observe
  // {
  //   "name": "observe",
  //   "arguments": { "instruction": "find all navigation links" }
  // }
  // 
  // Tool: extract
  // {
  //   "name": "extract",
  //   "arguments": { "instruction": "get the article title and author" }
  // }
  // 
  // Tool: end
  // {
  //   "name": "end",
  //   "arguments": {}
  // }
  
  console.log('MCP tools are called via JSON-RPC protocol.');
  console.log('See docs/tools.md for full tool reference.');
}

// Run the examples
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

// Uncomment to see MCP example:
// mcpExample();

export { main, mcpExample };