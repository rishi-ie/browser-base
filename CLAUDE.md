# CLAUDE.md — Working on browser-base

> Guide for AI coding agents (Claude Code, Pi Agent, and others) working in this repo.

## Project overview

`browser-base` is a **pi agent plugin** that gives the LLM running in pi a local Chrome with persistent login sessions. It's a self-hosted alternative to the cloud Browserbase product — same capabilities, runs entirely on your machine.

The LLM uses the `browser` tool to operate across the internet: browse websites, click buttons, fill forms, log into sites once and stay logged in via Chrome profiles.

Published as:
- `@browserbase/local` — the library (`Browser` class)
- `@browserbase/local-cli` — the `browse-local` binary
- `pi-extension.ts` — pi agent plugin (drop-in)

## Quick reference (for agents)

```
# Install (pi agent)
git clone https://github.com/browserbase/browser-base.git ~/.pi/agent/extensions/browser-base

# Then restart pi

# Context management CLI
browse-local context create <name>   # create a context
browse-local contexts                 # list contexts
browse-local navigate "<url>"        # open URL (no LLM)
browse-local act "<action>"           # click/type (LLM)
browse-local observe "<instruction>"  # find elements
browse-local extract "<instruction>"  # get structured data

# Programmatic API
import { Browser, resolveConfig } from '@browserbase/local';
const browser = new Browser(resolveConfig({ contextDir: './browser-context' }));
await browser.start('context-name');
await browser.navigate('https://...');
await browser.act('click the button');
await browser.observe('find the form');
await browser.extract('get the page title');
await browser.useContext('other-context');
await browser.end();
```

## Repository layout

```
browser-base/
├── packages/
│   ├── core/                    # @browserbase/local
│   │   └── src/
│   │       ├── index.ts          # public exports
│   │       ├── server.ts         # Browser class (public API)
│   │       ├── sessionManager.ts # Chrome + Stagehand lifecycle
│   │       ├── config.ts         # resolveConfig / Config
│   │       ├── logger.ts         # pino logger
│   │       └── tools/            # Agent integration tools
│   │           ├── index.ts      # createBrowserTool, etc.
│   │           ├── types.ts      # ToolResult, ToolContext, etc.
│   │           ├── navigate.ts   # navigate tool
│   │           ├── act.ts         # act tool
│   │           ├── observe.ts    # observe tool
│   │           └── extract.ts    # extract tool
│   └── cli/                      # @browserbase/local-cli
│       └── src/
│           ├── program.ts        # browse-local entry point
│           ├── projectConfig.ts  # config file loader
│           ├── core/             # copy of core library
│           └── commands/         # act, navigate, observe, extract,
│                                #   use-context, status, contexts,
│                                #   context create, install, start
├── pi-extension.ts              # Pi agent extension (drop-in)
├── examples/
│   ├── basic-usage.ts
│   ├── context-management.ts
│   └── autonomous-agent.ts
└── docs/
    ├── tools.md      # Browser class API reference
    ├── contexts.md   # context management guide
    ├── install.md    # agent integration guide
    └── architecture.md
```

## The `Browser` class

The entire public surface lives in `packages/core/src/server.ts`. It delegates to `SessionManager`.

```typescript
import { Browser, resolveConfig, createBrowser } from '@browserbase/local';

const browser = new Browser(resolveConfig({ contextDir: './browser-context' }));

// Lifecycle
await browser.start('github-main');     // throws if context dir doesn't exist
await browser.useContext('gmail');      // ends current session, starts new one
await browser.end();                    // idempotent

// Driving
await browser.navigate('https://github.com');
await browser.act('click the sign in button');
await browser.observe('find the search box');
await browser.extract('get the page title');

// Introspection
browser.isActive();               // boolean
browser.getCurrentContext();      // string
browser.getDebugUrl();            // chrome://inspect#...
browser.getCdpUrl();              // ws://localhost:9222
browser.getAvailableContexts();   // string[]

// Also exported: createBrowser(config) — same as new Browser(config)
```

Return types:
- `SessionInfo { sessionId, debugUrl, cdpUrl, context }` — from `start` and `useContext`
- `ActResult { success, message, actionDescription, actions, cacheStatus? }` — from `act`
- `Action { selector, description, method?, arguments? }` — from `observe`

All throwing methods produce descriptive error strings (e.g. `"Context 'x' not found. Available contexts: ..."`).

## The CLI

`browse-local` is registered in `packages/cli/src/program.ts`. Subcommands live in `packages/cli/src/commands/`.

All subcommands share the same config resolution: project-level `.browser-base/browser-base.json` → environment variables → defaults.

| Command | Description |
|---------|-------------|
| `browse-local act <action>` | One-shot natural-language action (starts session, does action, closes) |
| `browse-local navigate <url>` | One-shot navigation (no LLM needed) |
| `browse-local observe [instruction]` | List actionable elements on current page |
| `browse-local extract [instruction]` | Extract structured data from current page |
| `browse-local use-context <name>` | Switch context, keep session alive |
| `browse-local start` | Long-running session (blocks until SIGINT) |
| `browse-local status` | Print JSON config + session state |
| `browse-local contexts` | List available contexts |
| `browse-local context create <name>` | Create a new context directory |
| `browse-local install` | Set up browser-base in the project for a coding agent |

Common flags: `--context <name>`, `--headful`, `--keep-alive`, `--model <model>`, `--context-dir <path>`.

## Design decisions

- **Programmatic API first.** There is no MCP server, no stdio transport. The agent calls the `Browser` class or the CLI directly.
- **Stagehand LOCAL mode.** V3 class with `env: "LOCAL"`, connected to Chrome over CDP. Stagehand launches Chrome internally via its own `launchLocalChrome()`.
- **Context = Chrome profile dir.** A context is a directory passed as `--user-data-dir`. No custom storage — any Chrome tooling can read/write it.
- **Strict mode by default.** `start('nonexistent')` and `useContext('nonexistent')` throw. The directory must pre-exist. This prevents the "agent silently created a fresh context and is mysteriously logged out" bug.
- **`useContext` restarts Chrome.** Switching contexts ends the current session and starts a new one. Chrome locks its user-data-dir while running — you can't have two Chrome processes on the same context.
- **Headless by default.** `BROWSER_BASE_HEADFUL=1` (or `--headful`) makes Chrome visible.
- **`.env` is loaded by the CLI, not the library.** The library reads `process.env` directly. If you embed the library, load your own `.env`.

## Configuration

`resolveConfig(options)` merges in order: **caller options → env vars → defaults**.

| Env var | Description | Default |
|---------|-------------|---------|
| `BROWSER_BASE_CONTEXT_DIR` | Context directory | `./browser-context` |
| `BROWSER_BASE_DEFAULT_CONTEXT` | Default context name | `default` |
| `BROWSER_BASE_HEADFUL` | Show Chrome window | `false` |
| `BROWSER_BASE_BROWSER_PATH` | Chrome binary path | auto-detect |
| `BROWSER_BASE_CHROME_PORT` | CDP debugging port | `9222` |

The CLI also supports a project-level config file at `.browser-base/browser-base.json` (resolved by `loadProjectConfig` in `projectConfig.ts`).

**Note:** This is a pi agent plugin. The LLM (act/observe/extract) is handled by pi's configured model — no separate API key needed.

## Adding a new Browser method

1. Add the method to `packages/core/src/server.ts` (delegates to `SessionManager`)
2. Implement in `packages/core/src/sessionManager.ts`
3. Add a test in `packages/core/src/sessionManager.test.ts`
4. If it also needs a CLI subcommand, create `packages/cli/src/commands/<name>.ts`
5. Register the new command in `packages/cli/src/program.ts`
6. Update `docs/tools.md`

## Testing

```bash
pnpm build    # build both packages
pnpm test     # run unit tests (Vitest)
```

Unit tests mock `chrome-launcher` and `@browserbasehq/stagehand` — no real Chrome in CI.

## Tools API (for agent integrations)

The `packages/core/src/tools/` directory provides pre-built tools for integrating with
coding agents like pi agent, Claude Code, etc.

```typescript
import { createBrowserTool } from '@browserbase/local/tools';

const tool = createBrowserTool({
  getBrowser: () => new Browser(resolveConfig({})),
});

// For pi agent:
pi.registerTool(tool);

// Or use individual tools:
import { createNavigateTool, createActTool, createObserveTool, createExtractTool } from '@browserbase/local/tools';
```

### Tool types

```typescript
import type { ToolResult, ToolContext, ToolContent } from '@browserbase/local/tools';

interface ToolResult {
  success: boolean;
  content: ToolContent[];  // [{ type: 'text' | 'image' | 'error', text?: string }]
  details?: unknown;
  error?: string;
}
```

## Pi Agent Extension

`pi-extension.ts` is a drop-in extension for pi agent. Copy it to:
- `~/.pi/agent/extensions/browser-base.ts` (global)
- `.pi/extensions/browser-base.ts` (project-local)

The extension registers:
- `browser` tool — unified tool for all browser actions
- `/browser-contexts` command — list available contexts
- `/browser-create-context` command — create new context

## Common gotchas

- **"Context not found"** — the context dir doesn't exist on disk. Run `browse-local context create <name>` first, then pre-login manually.
- **"No browser session running"** — called `navigate`/`act`/etc. before `start`. The methods throw intentionally.
- **`act` keeps failing** — the LLM can't find the element. Call `observe('...')` first to see what's on the page.
- **Chrome locked profile** — another Chrome is open with the same `--user-data-dir`. Quit all Chrome instances or use a different context.
- **No `OPENAI_API_KEY`** — `act`/`observe`/`extract` need an LLM. `navigate` does not.

## Where to look first

| If you want to... | Read this file |
|-------------------|----------------|
| Understand the public API | `packages/core/src/server.ts` |
| Understand Chrome/Stagehand wiring | `packages/core/src/sessionManager.ts` |
| Understand config resolution | `packages/core/src/config.ts` |
| Understand the CLI | `packages/cli/src/program.ts` + `commands/*.ts` |
| Understand project-level config | `packages/cli/src/projectConfig.ts` |
| See a real usage example | `examples/basic-usage.ts` |
| Integrate with pi agent | `pi-extension.ts` |
| Use the tools API | `packages/core/src/tools/index.ts` |