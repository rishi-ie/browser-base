import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import { getAvailableContexts } from '../core/index.js';
export const contextsCommand = new Command('contexts')
    .description('List available browser contexts')
    .option('--context-dir <path>', 'Path to browser-context directory', './browser-context')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
    const contextDir = path.resolve(opts.contextDir);
    const contexts = await getAvailableContexts(contextDir);
    if (opts.json) {
        process.stdout.write(JSON.stringify({ contexts, contextDir }, null, 2) + '\n');
        return;
    }
    if (contexts.length === 0) {
        console.log('No contexts found. Run `browse-local context create <name>` to create one.');
    }
    else {
        console.log('Available contexts:');
        for (const ctx of contexts) {
            const profilePath = path.join(contextDir, ctx);
            let isDirectory = false;
            try {
                const stats = await fs.stat(profilePath);
                isDirectory = stats.isDirectory();
            }
            catch {
                // ignore
            }
            console.log(`  - ${ctx}${isDirectory ? ' (directory)' : ''}`);
        }
    }
});
//# sourceMappingURL=contexts.js.map