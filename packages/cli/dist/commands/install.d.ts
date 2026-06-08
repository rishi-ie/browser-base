import { Command } from 'commander';
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
export declare const installCommand: Command;
//# sourceMappingURL=install.d.ts.map