import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';

export const contextCreateCommand = new Command('context')
  .description('Manage browser contexts');

contextCreateCommand
  .command('create <name>')
  .description('Create a new browser context directory')
  .option('--context-dir <path>', 'Path to browser-context directory', './browser-context')
  .action(async (name, opts) => {
    const contextDir = path.resolve(opts.contextDir);
    const contextPath = path.join(contextDir, name);
    
    if (await fs.pathExists(contextPath)) {
      console.error(`Context '${name}' already exists at ${contextPath}`);
      process.exit(1);
    }
    
    await fs.ensureDir(contextPath);
    console.log(`Created context '${name}' at ${contextPath}`);
    console.log(`\nTo use this context:`);
    console.log(`  1. Open Chrome manually: google-chrome --user-data-dir="${contextPath}"`);
    console.log(`  2. Log into the website you need`);
    console.log(`  3. Close Chrome`);
    console.log(`  4. The context is now ready for agents to use`);
  });
