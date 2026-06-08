# CLAUDE.md — Working on browser-base

> Guide for AI coding agents (Claude Code, Pi Agent, and others) working in this repo.

## Project overview

`browser-base` is a self-hosted browser infrastructure for AI coding agents. It exposes a `Browser` class and a `browse-local` CLI that drive a real local Chrome via [Stagehand V3](https://github.com/browserbase/stagehand) (env: "LOCAL", CDP). The killer feature is **persistent login sessions** stored as Chrome user-profile directories ("contexts") — agents stay logged in across runs.

Published as:
- `@browserbase/local` — the library (`Browser` class)
- `@browserbase/local-cli` — the `browse-local` binary

## Quick reference (for agents)

```
browse-local act "<action>"           # click/type using natural language
browse-local navigate "<url>"         # open a URL (no LLM needed)
browse-local observe "[instruction]"  # list actionable elements on page
browse-local extract "[instruction>"  # extract structured data from page
browse-local use-context <name>       # switch context (restarts session)
browse-local start                    # long-running (blocks until SIGINT)
browse-local status                   # current config and session state
browse-local contexts                 # list available contexts
browse-local context create <name>    # create a new context dir

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
│   │       └── logger.ts         # pino logger
│   └── cli/                      # @browserbase/local-cli
│       └── src/
│           ├── program.ts        # browse-local entry point
│           ├── projectConfig.ts  # config file loader
│           └── commands/         # act, navigate, observe, extract,
│                                #   use-context, status, contexts,
│                                #   context create, install, start
├── examples/
│   ├── basic-usage.ts
│   ├── context-management.ts
│   └── autonomous-agent.ts
└── docs/
    ├── tools.md      # Browser class API reference
    ├── contexts.md    # context management guide
    ├── install.md     # agent integration guide
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
| `BROWSER_BASE_HEADFUL` | Show Chrome window | `0` |
| `BROWSER_BASE_MODEL` | LLM model (`provider/model`) | `openai/gpt-4.1-mini` |
| `BROWSER_BASE_VERBOSE` | Log verbosity | `0` |
| `BROWSER_BASE_BROWSER_PATH` | Chrome binary path | auto-detect |
| `BROWSER_BASE_CHROME_PORT` | CDP debugging port | `9222` |
| `OPENAI_API_KEY` | Required for act/observe/extract | — |

The CLI also supports a project-level config file at `.browser-base/browser-base.json` (resolved by `loadProjectConfig` in `projectConfig.ts`).

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