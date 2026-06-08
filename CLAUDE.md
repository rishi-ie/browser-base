# CLAUDE.md — Working on browser-base

> Guide for Claude Code and other AI assistants working in this repo.

## Project overview

`browser-base` is a self-hosted browser infrastructure for AI coding agents. It exposes a programmatic `Browser` class and a `browse-local` CLI that drive a real local Chrome instance via [Stagehand](https://github.com/browserbase/stagehand). The killer feature is **persistent login sessions** stored as Chrome user-profile directories ("contexts") — agents stay logged in across runs.

The package is published as:

- `@browserbase/local` — the library (Node 22+, ESM, TypeScript)
- `@browserbase/local-cli` — the `browse-local` binary

## Repository layout

```
browser-base/
├── packages/
│   ├── core/                    # @browserbase/local
│   │   └── src/
│   │       ├── index.ts         # public exports
│   │       ├── server.ts        # Browser class (the public API)
│   │       ├── sessionManager.ts # Chrome + Stagehand lifecycle
│   │       ├── config.ts        # Config / ResolvedConfig / resolveConfig
│   │       ├── logger.ts        # pino logger
│   │       ├── transport.ts     # placeholder (programmatic mode, no transport)
│   │       └── tools/           # internal tool definitions (Zod-typed)
│   │           ├── tool.ts
│   │           ├── start.ts, end.ts, useContext.ts
│   │           ├── navigate.ts, act.ts, observe.ts, extract.ts
│   │           └── index.ts
│   └── cli/                     # @browserbase/local-cli
│       └── src/
│           ├── program.ts       # commander entry, registers all subcommands
│           ├── commands/
│           │   ├── start.ts          # long-running `browse-local start`
│           │   ├── contexts.ts       # `browse-local contexts`
│           │   ├── contextCreate.ts  # `browse-local context create <name>`
│           │   └── install.ts        # `browse-local install`
│           └── install/         # Claude Desktop / Cursor / VS Code installers
├── examples/
│   ├── basic-usage.ts
│   ├── context-management.ts
│   └── autonomous-agent.ts
├── docs/
│   ├── tools.md
│   ├── install.md
│   ├── contexts.md
│   ├── architecture.md
│   └── README.md
└── browser-context/             # created at runtime; holds Chrome profiles
```

## The `Browser` class

The entire public surface lives in `packages/core/src/server.ts`. It is a thin wrapper around `SessionManager`.

```typescript
import { Browser, resolveConfig, createBrowser } from '@browserbase/local';

const browser = new Browser(resolveConfig({ contextDir: './browser-context' }));
// — or —
// const browser = createBrowser(resolveConfig({ contextDir: './browser-context' }));

// Lifecycle
await browser.start('github-main');   // throws if context dir doesn't exist
await browser.useContext('gmail');   // ends current session, starts new one
await browser.end();                 // idempotent

// Driving
await browser.navigate('https://github.com');
await browser.act('click the sign in button');
await browser.observe('find the search box');
await browser.extract('get the page title');

// Introspection
browser.isActive();
browser.getCurrentContext();
browser.getAvailableContexts();
browser.getDebugUrl();              // chrome://inspect#...
```

Return types you may care about:

- `SessionInfo { sessionId, debugUrl, cdpUrl, context }` — from `start` and `useContext`
- `ActResult { success, message, actionDescription, actions, cacheStatus? }` — from `act`
- `Action { selector, description, method?, arguments? }` — from `observe`

All throwing methods reject with descriptive errors (e.g. `"Context 'x' not found. Available contexts: ..."`).

## The CLI

`browse-local` is registered in `packages/cli/src/program.ts`. Subcommands live in `packages/cli/src/commands/`.

| Command | What it does |
|---------|--------------|
| `browse-local start` | Long-running. Loads `.env`, resolves config, starts a `Browser`, prints debug/CDP URLs, blocks on `await new Promise(() => {})` until SIGINT/SIGTERM. |
| `browse-local contexts` | Lists directories under `--context-dir`. |
| `browse-local context create <name>` | Creates a new context directory and prints the manual-login instructions. |
| `browse-local install [--agent <name>]` | Writes an MCP-server entry into Claude Desktop, Cursor, VS Code, or all three. |

`browse-local start` accepts these flags: `--headful`, `--context-dir`, `--model`, `--verbose`, `--default-context`, `--browser-path`, `--chrome-port`. The `start` command is what agent runtimes execute to host the Browser.

## Design decisions

- **Programmatic first.** The public API is the `Browser` class. There is no MCP server, no stdio transport, no HTTP transport in the default flow. `transport.ts` is a placeholder.
- **Stagehand LOCAL mode.** We use `@browserbasehq/stagehand`'s `V3` class with `env: "LOCAL"` and connect it to Chrome over CDP. No Playwright dependency in the core.
- **Context = Chrome profile dir.** No custom storage format. A context is literally a directory passed as `--user-data-dir`. This means any standard Chrome tooling can read/write contexts.
- **Strict mode by default.** `start('nonexistent')` and `useContext('nonexistent')` throw — they do not silently create. This is to prevent the "agent silently created a fresh context and is now mysteriously logged out" footgun. The check lives in `SessionManager.start` and `SessionManager.useContext`.
- **One active session.** The `SessionManager` holds at most one running session at a time. `useContext` ends the current one before starting the next.
- **`useContext` is restart, not in-place.** Switching contexts ends and re-launches Chrome because Chrome locks its user-data-dir while running.
- **Headless by default.** `BROWSER_BASE_HEADFUL=1` (or `--headful`) makes Chrome visible. The default keeps things quiet for CI / agents.
- **Verbose default is 0.** Most users don't want pino-pretty noise. Bump to `1` or `2` for debugging.
- **`.env` is loaded by the CLI, not the library.** `browse-local start` calls `dotenv.config()` before `resolveConfig`. The library itself reads only `process.env`. If you embed the library in your own process, load your own `.env`.
- **No HTTP transport.** The CLI does not expose `--port` on `start`; the `port` field exists in `Config` for future use, but the shipped start command never opens an HTTP server.

## Configuration

`resolveConfig(options)` (`packages/core/src/config.ts`) merges, in order:

1. Caller-provided `options`
2. Environment variables: `BROWSER_BASE_HEADFUL`, `BROWSER_BASE_BROWSER_PATH`, `BROWSER_BASE_CONTEXT_DIR`, `BROWSER_BASE_PORT`, `BROWSER_BASE_HOST`, `BROWSER_BASE_MODEL`, `BROWSER_BASE_VERBOSE`, `BROWSER_BASE_DEFAULT_CONTEXT`
3. Built-in defaults: `headful=false`, `browserPath=null`, `contextDir='./browser-context'`, `chromePort=9222`, `host='localhost'`, `model='openai/gpt-4.1-mini'`, `verbose=0`, `defaultContext='default'`

There is no config-file loader in the core. The CLI's `browse-local start` reads `.env` via `dotenv`.

## Adding a new method to `Browser`

1. Add the method to the `Browser` class in `packages/core/src/server.ts` (typically a one-liner that delegates to `SessionManager`).
2. Implement the underlying behavior in `packages/core/src/sessionManager.ts`. Throwing methods should reject with a clear `Error` message — agents read these strings.
3. Add or extend a test in `packages/core/src/sessionManager.test.ts`. The existing tests mock `chrome-launcher` and `@browserbasehq/stagehand`; reuse that pattern.
4. If the method also needs to be exposed to the CLI's MCP-host installers, add a corresponding tool in `packages/core/src/tools/<name>.ts` and register it in `tools/index.ts`.
5. Update [docs/tools.md](docs/tools.md) and the README's API section.

## Adding a new CLI command

1. Create `packages/cli/src/commands/<name>.ts` exporting a `new Command('<name>')`.
2. Register it in `packages/cli/src/program.ts` with `program.addCommand(...)`.
3. If the command needs a new agent installer (e.g. a new IDE), add a file under `packages/cli/src/install/` and a case in `install/index.ts`.

## Testing

```bash
# Build everything
pnpm install
pnpm build

# Run unit tests (Vitest)
cd packages/core && pnpm test

# Run one test file
cd packages/core && pnpm test -- sessionManager.test.ts
```

The core test suite uses `vi.mock` to stub `chrome-launcher` and `@browserbasehq/stagehand` — there is no real Chrome launched in CI. If you need an integration test, run a real `browse-local start` against a throwaway context dir.

## Common gotchas

- **"Context not found"** — the user hasn't run `browse-local context create <name>` yet. Direct them to [docs/contexts.md](docs/contexts.md).
- **"No browser session running"** — they called `navigate` / `act` / etc. before `start`. The methods throw; this is intentional.
- **`act` returns a vague error** — the LLM could not find the element. Have the agent call `observe(...)` first to see what's on the page.
- **Chrome locked profile** — the user has a regular Chrome window open with the same `--user-data-dir`. The context directory can only be used by one Chrome at a time. Tell them to quit Chrome first.
- **No `OPENAI_API_KEY`** — `act` / `observe` / `extract` need an LLM. `navigate` does not.

## Where to look first

| If you want to... | Read this file |
|-------------------|----------------|
| Understand the API surface | `packages/core/src/server.ts` |
| Understand Chrome / Stagehand wiring | `packages/core/src/sessionManager.ts` |
| Understand config precedence | `packages/core/src/config.ts` |
| Understand the CLI | `packages/cli/src/program.ts` + `commands/start.ts` |
| Add an installer for a new agent | `packages/cli/src/install/index.ts` + `install/<agent>.ts` |
| See a real usage example | `examples/basic-usage.ts` |
