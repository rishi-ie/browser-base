import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';

export const contextsCommand = new Command('contexts')
  .description('List available browser contexts')
  .option('--context-dir <path>', 'Path to browser-context directory', './browser-context')
  .action(async (opts) => {
    const contextDir = path.resolve(opts.contextDir);
    
    if (!await fs.pathExists(contextDir)) {
      console.log('No contexts found. Run `browse-local context create <name>` to create one.');
      return;
    }
    
    const entries = await fs.readdir(contextDir);
    const contexts = entries.filter((name) => !name.startsWith('.'));
    
    if (contexts.length === 0) {
      console.log('No contexts found. Run `browse-local context create <name>` to create one.');
    } else {
      console.log('Available contexts:');
      for (const ctx of contexts) {
        const profilePath = path.join(contextDir, ctx);
        const stats = await fs.stat(profilePath);
        console.log(`  - ${ctx} ${stats.isDirectory() ? '(directory)' : ''}`);
      }
    }
  });
