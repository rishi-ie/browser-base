import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
/**
 * Project-level install for the browser-base CLI.
 *
 * Goal: set up a project directory so a coding agent (Pi, Claude
 * Code, etc.) can drive a real Chrome via \`browse-local ...\`.
 *
 * What it does:
 *   1. Detects the project root (looks for package.json /
 *      pyproject.toml / Cargo.toml / go.mod, otherwise uses CWD).
 *   2. Creates \`.browser-base/\` with a \`contexts/default\` dir
 *      and a \`browser-base.json\` config file.
 *   3. Appends (or creates) an AGENTS.md section in the project
 *      root describing the CLI surface for the agent.
 *   4. Prints next steps: how to log into sites manually, how to
 *      call the CLI, and how to wire the agent's LLM API key.
 *
 * What it does NOT do:
 *   - Install as an MCP server (we don't ship one).
 *   - Touch global agent configs (~\/.claude.json, etc.).
 *   - Auto-install contexts for specific sites (use
 *     \`browse-local context create <name>\`).
 */
export const installCommand = new Command('install')
    .description('Set up browser-base in the current project for a coding agent to drive')
    .option('--project-dir <path>', 'Project root to install into', '.')
    .option('--agent <name>', 'Target agent for AGENTS.md: pi-agent, claude-code, both', 'both')
    .option('--default-context <name>', 'Name of the default context to create', 'default')
    .option('--model <model>', 'Default LLM model to put in browser-base.json', 'openai/gpt-4.1-mini')
    .option('--dry-run', 'Print what would be done without writing anything')
    .action(async (opts) => {
    const projectDir = path.resolve(opts.projectDir);
    const agent = String(opts.agent);
    const defaultContext = String(opts.defaultContext);
    const model = String(opts.model);
    const dryRun = Boolean(opts.dryRun);
    if (!['pi-agent', 'claude-code', 'both'].includes(agent)) {
        process.stderr.write(JSON.stringify({ error: `Unknown --agent value '${agent}'. Use pi-agent, claude-code, or both.` }) + '\n');
        process.exit(1);
    }
    const detected = await detectProjectRoot(projectDir);
    const browserBaseDir = path.join(detected, '.browser-base');
    const contextsDir = path.join(browserBaseDir, 'contexts');
    const defaultContextDir = path.join(contextsDir, defaultContext);
    const configPath = path.join(browserBaseDir, 'browser-base.json');
    const configPayload = {
        contextDir: contextsDir,
        defaultContext,
        model,
    };
    const agentsMdPath = path.join(detected, 'AGENTS.md');
    const actions = [];
    // 1. .browser-base/contexts/default
    if (await exists(defaultContextDir)) {
        actions.push({ action: 'create-dir', target: defaultContextDir, status: 'skipped' });
    }
    else {
        actions.push({
            action: 'create-dir',
            target: defaultContextDir,
            status: dryRun ? 'would-write' : 'wrote',
        });
        if (!dryRun)
            await fs.mkdir(defaultContextDir, { recursive: true });
    }
    // 2. .browser-base/browser-base.json
    if (await exists(configPath)) {
        actions.push({ action: 'write-config', target: configPath, status: 'skipped' });
    }
    else {
        actions.push({
            action: 'write-config',
            target: configPath,
            status: dryRun ? 'would-write' : 'wrote',
        });
        if (!dryRun) {
            await fs.mkdir(browserBaseDir, { recursive: true });
            await fs.writeFile(configPath, JSON.stringify(configPayload, null, 2) + '\n', 'utf-8');
        }
    }
    // 3. AGENTS.md
    const agentsMdSection = buildAgentsMdSection({ agent, configPath, contextsDir, defaultContext });
    let existingAgents = '';
    const existsAgents = await exists(agentsMdPath);
    if (existsAgents) {
        existingAgents = await fs.readFile(agentsMdPath, 'utf-8');
    }
    if (existingAgents.includes('<!-- browser-base:start -->')) {
        actions.push({ action: 'update-AGENTS.md', target: agentsMdPath, status: 'skipped' });
    }
    else {
        actions.push({
            action: 'update-AGENTS.md',
            target: agentsMdPath,
            status: dryRun ? 'would-write' : 'wrote',
        });
        if (!dryRun) {
            const next = (existingAgents ? existingAgents.replace(/\s*$/, '\n\n') : '') + agentsMdSection;
            await fs.writeFile(agentsMdPath, next, 'utf-8');
        }
    }
    // 4. Print summary
    const summary = {
        projectRoot: detected,
        browserBaseDir,
        configPath,
        contextsDir,
        defaultContext,
        model,
        agent,
        dryRun,
        actions,
        nextSteps: buildNextSteps({ contextsDir, defaultContext }),
    };
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
    if (!dryRun) {
        process.stderr.write(`\nbrowser-base is installed in ${detected}\n` +
            `  config:    ${configPath}\n` +
            `  contexts:  ${contextsDir}\n` +
            `  AGENTS.md: ${agentsMdPath}\n\n` +
            `Next:\n` +
            `  1. Log into sites manually:\n` +
            `       open -na "Google Chrome" --args --user-data-dir="${defaultContextDir}"\n` +
            `  2. Set your LLM API key in the environment (e.g. OPENAI_API_KEY).\n` +
            `  3. Run \`browse-local status\` to confirm the setup, then\n` +
            `     \`browse-local act "..."\`, \`browse-local navigate ...\`, etc.\n`);
    }
});
async function exists(p) {
    try {
        await fs.access(p);
        return true;
    }
    catch {
        return false;
    }
}
const PROJECT_MARKERS = [
    'package.json',
    'pyproject.toml',
    'Cargo.toml',
    'go.mod',
    'pom.xml',
    'build.gradle',
    'Gemfile',
    'composer.json',
    '.git',
];
/**
 * Walk up from the start dir looking for a project marker. If none
 * is found, fall back to the start dir itself.
 */
async function detectProjectRoot(startDir) {
    let dir = path.resolve(startDir);
    const { root } = path.parse(dir);
    // First check the start dir itself.
    if (await hasAnyMarker(dir))
        return dir;
    // Walk up.
    while (true) {
        if (await hasAnyMarker(dir))
            return dir;
        const parent = path.dirname(dir);
        if (parent === dir || parent === root)
            return path.resolve(startDir);
        dir = parent;
    }
}
async function hasAnyMarker(dir) {
    for (const marker of PROJECT_MARKERS) {
        if (await exists(path.join(dir, marker)))
            return true;
    }
    return false;
}
function buildAgentsMdSection(opts) {
    const { configPath, contextsDir, defaultContext } = opts;
    return `<!-- browser-base:start -->
## browser-base

This project uses [browser-base](https://github.com/example/browser-base), a self-hosted browser infra that this CLI (\`browse-local\`) drives.

### Available commands

All commands are run as one-shots. They start a Chrome session, do the work, and tear the session down. Use \`--keep-alive\` (or set \`BROWSER_BASE_KEEP_ALIVE=1\`) to keep the session alive between calls.

\`\`\`bash
browse-local status                              # config + session state (JSON)
browse-local navigate "https://github.com"       # go to a URL
browse-local act "click the sign-in button"      # perform an action (LLM)
browse-local observe "find the search button"    # list actionable elements
browse-local extract "get the page title"        # extract structured data
browse-local use-context github-main             # switch contexts (long-running)
browse-local start --http-port 9223              # long-running server with /status
browse-local context create <name>               # create a new context dir
browse-local contexts                            # list available contexts
\`\`\`

### Contexts

Contexts are Chrome profile directories. Each one keeps its own cookies / logins. They live in \`${contextsDir}\`. The default context is \`${defaultContext}\`.

To log into a site manually, open Chrome with the context's user-data-dir:

\`\`\`bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \\
  --user-data-dir="${contextsDir}/<context-name>"
\`\`\`

### LLM API key

\`act\`, \`observe\`, and \`extract\` use an LLM. The default model is set in \`${configPath}\` and the API key must be in the environment (\`OPENAI_API_KEY\`, \`ANTHROPIC_API_KEY\`, etc.) matching the model provider.

### Configuration

Resolved from highest to lowest priority: CLI flags → \`$BROWSER_BASE_*\` env vars → \`${configPath}\` → \`~/.browser-base/config.json\` → built-in defaults.

<!-- browser-base:end -->
`;
}
function buildNextSteps(opts) {
    const { contextsDir, defaultContext } = opts;
    const defaultPath = path.join(contextsDir, defaultContext);
    return [
        `Open Chrome against the default context to log in:\n    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --user-data-dir="${defaultPath}"`,
        'Set OPENAI_API_KEY (or the matching provider key) in your shell.',
        'Run `browse-local status` to confirm everything is wired up.',
        'Drive the browser from your agent: `browse-local act "..."` / `navigate "..."` / etc.',
    ];
}
//# sourceMappingURL=install.js.map