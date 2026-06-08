import { Command } from 'commander';
import * as fs from 'fs/promises';
import { createBrowser } from '../core/index.js';
import { loadProjectConfig, toResolvedConfig } from '../projectConfig.js';
export const extractCommand = new Command('extract')
    .description('Extract structured data from the current page')
    .argument('[instruction]', 'Optional natural-language instruction for what to extract')
    .option('--schema <path>', 'Path to a JSON schema file describing the expected output')
    .option('--context <name>', 'Browser context to use (overrides default)')
    .option('--keep-alive', 'Do not end the session after extracting')
    .option('--context-dir <path>', 'Path to browser-context directory (overrides config)')
    .option('--model <model>', 'LLM model to use (overrides config)')
    .option('--headful', 'Run Chrome in headful mode (overrides config)')
    .action(async (instruction, opts) => {
    const { config: project } = await loadProjectConfig();
    const useContext = opts.context ?? project.defaultContext;
    const keepAlive = Boolean(opts.keepAlive) || process.env['BROWSER_BASE_KEEP_ALIVE'] === '1';
    const config = toResolvedConfig({
        ...project,
        contextDir: opts.contextDir ?? project.contextDir,
        model: opts.model ?? project.model,
        headful: Boolean(opts.headful) || project.headful,
    });
    let schema;
    if (opts.schema) {
        try {
            const raw = await fs.readFile(opts.schema, 'utf-8');
            schema = JSON.parse(raw);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            process.stderr.write(JSON.stringify({
                error: `Could not read schema file '${opts.schema}': ${message}`,
            }, null, 2) + '\n');
            process.exitCode = 1;
            return;
        }
    }
    const browser = createBrowser(config);
    try {
        const sessionInfo = await browser.start(useContext);
        const data = await browser.extract(instruction, schema);
        process.stdout.write(JSON.stringify({
            data,
            context: sessionInfo.context,
            instruction: instruction ?? null,
        }, null, 2) + '\n');
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(JSON.stringify({ error: message }, null, 2) + '\n');
        process.exitCode = 1;
    }
    finally {
        if (!keepAlive) {
            try {
                await browser.end();
            }
            catch { /* ignore */ }
        }
    }
});
//# sourceMappingURL=extract.js.map