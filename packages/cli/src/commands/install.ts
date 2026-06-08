import { Command } from 'commander';

export const installCommand = new Command('install')
  .description('Install browser-base into your coding agent (Claude Desktop, Cursor, etc.)')
  .option('--agent <name>', 'Target agent: claude-desktop, cursor, vscode, all', 'all')
  .option('--dry-run', 'Show what would be done without doing it')
  .action(async (opts) => {
    const { installBrowserBase } = await import('../install/index.js');
    const results = await installBrowserBase({
      agent: opts.agent,
      dryRun: opts.dryRun,
    });
    
    for (const [agent, result] of Object.entries(results)) {
      if (result.success) {
        console.log(`✅ ${agent}: ${result.message}`);
      } else {
        console.log(`❌ ${agent}: ${result.message}`);
      }
    }
  });
