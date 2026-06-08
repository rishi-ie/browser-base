# Architecture

`browser-base` is a thin Node library + CLI that drives a local Chrome via Stagehand. There is no server, no transport, and no protocol layer in the default flow — the public API is a plain async `Browser` class that your code (or your agent) calls directly.

## High-level diagram

```
                 Your code / agent
                        │
                        │  const browser = new Browser(...)
                        │  await browser.start('github-main')
                        │  await browser.act('click sign in')
                        ▼
        ┌───────────────────────────────────────┐
        │  Browser  (packages/core/src/server.ts) │
        │                                       │
        │  Thin facade. Delegates every method  │
        │  to a SessionManager.                 │
        └───────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────────┐
        │  SessionManager  (sessionManager.ts)      │
        │                                           │
        │  Owns:                                    │
        │   - chrome-launcher Chrome instance       │
        │   - @browserbasehq/stagehand V3 client    │
        │   - the active context name               │
        │                                           │
        │  Routes act/observe/extract to Stagehand. │
        │  Routes navigate to activePage.goto.      │
        └───────────────────────────────────────────┘
                        │                      │
              chrome-launcher           Stagehand (V3, env: "LOCAL")
                        │                      │
                        ▼                      ▼
                 ┌────────────────────────────────┐
                 │  Chrome (local process)         │
                 │  --user-data-dir=<contextDir>/  │
                 │       <contextName>             │
                 │  --remote-debugging-port=9222   │
                 │                                 │
                 │  Inside Chrome:                 │
                 │   - the actual web pages        │
                 │   - the cookies/storage         │
                 │   - Stagehand's CDP client      │
                 │     driving it                  │
                 └────────────────────────────────┘
```

## Packages

```
packages/
├── core/          @browserbase/local
└── cli/           @browserbase/local-cli
```

### `@browserbase/local`

The library. Entry point: `packages/core/src/index.ts`.

| File | Role |
|------|------|
| `server.ts` | `Browser` class. The public API. |
| `sessionManager.ts` | Chrome lifecycle, Stagehand client, active context tracking. |
| `config.ts` | `Config`, `ResolvedConfig`, `resolveConfig`, `validateConfig`, `getAvailableContexts`, `contextExists`. |
| `logger.ts` | pino + pino-pretty logger. |
| `transport.ts` | Placeholder. No transport in the default flow. |
| `tools/` | Internal Zod-typed tool definitions (one per `Browser` method). Used for the optional MCP-server wrapper that some agent installers wire up. |
| `*.test.ts` | Vitest unit tests for `config` and `sessionManager`. |

Public exports (`index.ts`):

```typescript
export { Browser, createBrowser } from './server.js';
export type { ActResult, Action, SessionInfo } from './sessionManager.js';
export { SessionManager } from './sessionManager.js';

export { resolveConfig, validateConfig, getAvailableContexts, contextExists } from './config.js';
export type { Config, ResolvedConfig } from './config.js';

export { defineTool, ok, err, requireSession } from './tools/tool.js';
export type { Tool, ToolResult } from './tools/tool.js';

export { createLogger, createChildLogger } from './logger.js';
export type { LogLevel } from './logger.js';

export {
  startTool, endTool, useContextTool,
  navigateTool, actTool, observeTool, extractTool,
} from './tools/index.js';
```

### `@browserbase/local-cli`

The CLI. Entry point: `packages/cli/src/program.ts`.

| File | Role |
|------|------|
| `program.ts` | Registers the subcommands with `commander`. |
| `commands/start.ts` | `browse-local start` — long-running, holds the session open. |
| `commands/contexts.ts` | `browse-local contexts` — list available contexts. |
| `commands/contextCreate.ts` | `browse-local context create <name>`. |
| `commands/install.ts` | `browse-local install` — write MCP-server entries to Claude Desktop / Cursor / VS Code. |
| `install/claudeDesktop.ts` | Patches `claude_desktop_config.json`. |
| `install/cursor.ts` | Patches `~/.cursor/mcp.json`. |
| `install/vscode.ts` | Patches VS Code MCP settings. |
| `install/generic.ts` | Shared helper for JSON-merge installers. |
| `install/index.ts` | Dispatches to the right installer. |

## Request flow

`act` is the most interesting case — it goes through the LLM.

```
  caller                    Browser                   SessionManager            Stagehand (V3)              Chrome
    │                          │                            │                          │                         │
    │ act('click sign in')     │                            │                          │                         │
    ├─────────────────────────>│                            │                          │                         │
    │                          │ act('click sign in')       │                          │                         │
    │                          ├───────────────────────────>│                          │                         │
    │                          │                            │ stagehand.act({action})   │                         │
    │                          │                            ├─────────────────────────>│                         │
    │                          │                            │                          │  LLM: pick selector     │
    │                          │                            │                          │  CDP: Input.dispatch    │
    │                          │                            │                          ├────────────────────────>│
    │                          │                            │                          │  ◀──── result ──────────│
    │                          │                            │  ◀───── ActResult ───────│                         │
    │                          │  ◀─────── ActResult ───────│                          │                         │
    │  ◀────── ActResult ──────│                            │                          │                         │
```

Step by step:

1. Caller invokes `browser.act('click sign in')`.
2. `Browser.act` checks that a session is active, then delegates to `sessionManager.act(action)`.
3. `SessionManager.act` calls `this.stagehand.act(action)` — Stagehand's natural-language action method.
4. Stagehand uses the configured LLM to pick the right element on the current page, then dispatches the appropriate CDP command (e.g. `Input.dispatchMouseEvent`) to Chrome.
5. Chrome executes, returns the result via CDP, Stagehand wraps it as `ActResult`.
6. `SessionManager` logs the result and returns it to `Browser`, which returns it to the caller.

`observe` and `extract` follow the same pattern. `navigate` skips Stagehand's LLM and just calls `page.goto(url)` on the active page.

## Session lifecycle

```
                     ┌────────────────────────────────┐
                     │  Browser / SessionManager       │
                     └────────────────────────────────┘
                                  │
   new Browser(config)             │
        │                          │
        ▼                          │
   (idle) ─── start(ctx) ────────> │ launches Chrome with --user-data-dir=<ctx>
        │                          │ creates Stagehand V3 (env: "LOCAL")
        │                          │ connects to Chrome over CDP
        │                          │
        │                          │  ┌──────────────────────────┐
        │                          │  │ active (state)           │
        │                          │  │   - chromeInstance       │
        │                          │  │   - stagehand            │
        │                          │  │   - currentContext       │
        │                          │  └──────────────────────────┘
        │                          │            │
        │   navigate / act /       │            │
        │   observe / extract      │            │
        ├─────────────────────────>│<───────────┘
        │                          │
        │   useContext(other)      │  end() → start(other)
        ├─────────────────────────>│
        │                          │
        │   end()                  │  stagehand.close() + chrome.kill()
        ├─────────────────────────>│
        ▼                          │
   (idle)                          │
```

There is at most **one** active session per `Browser` / `SessionManager`. `useContext` ends the current one and starts a new one. There is no multi-context fan-out — Chrome's profile lock makes that hard, and the use case is rare.

## Configuration resolution

`resolveConfig` in `packages/core/src/config.ts` merges, in order:

1. Caller-provided options
2. Environment variables: `BROWSER_BASE_HEADFUL`, `BROWSER_BASE_BROWSER_PATH`, `BROWSER_BASE_CONTEXT_DIR`, `BROWSER_BASE_PORT`, `BROWSER_BASE_HOST`, `BROWSER_BASE_MODEL`, `BROWSER_BASE_VERBOSE`, `BROWSER_BASE_DEFAULT_CONTEXT`
3. Built-in defaults

| Field | Default | Env var |
|-------|---------|---------|
| `headful` | `false` | `BROWSER_BASE_HEADFUL` (truthy = `1`) |
| `browserPath` | `null` (auto-detect) | `BROWSER_BASE_BROWSER_PATH` |
| `contextDir` | `'./browser-context'` | `BROWSER_BASE_CONTEXT_DIR` |
| `chromePort` | `9222` | — |
| `port` | `undefined` | `BROWSER_BASE_PORT` |
| `host` | `'localhost'` | `BROWSER_BASE_HOST` |
| `model` | `'openai/gpt-4.1-mini'` | `BROWSER_BASE_MODEL` |
| `verbose` | `0` | `BROWSER_BASE_VERBOSE` |
| `defaultContext` | `'default'` | `BROWSER_BASE_DEFAULT_CONTEXT` |

The CLI (`browse-local start`) additionally calls `dotenv.config()` so a `.env` in CWD is loaded.

## Strict mode

`SessionManager.start` and `SessionManager.useContext` both check that the context directory exists on disk before doing anything. There is no "non-strict" mode:

- `browse-local context create <name>` is the only sanctioned way to make a context exist.
- `browser.start('missing')` and `browser.useContext('missing')` both throw a descriptive `Error`.
- `validateContextName` rejects empty names, `.`, `..`, and any name containing `/` or `\`.

The rationale: silent auto-creation is a footgun. An agent says "open GitHub", we silently create a fresh context, the agent tries to act, the cookies aren't there, debugging ensues. Failing loud is much easier to diagnose.

## Tools vs Browser

There are two parallel surfaces in `packages/core/src/tools/`:

- The `Browser` class — the public programmatic API. Every method (`start`, `end`, `useContext`, `navigate`, `act`, `observe`, `extract`) is a plain async function.
- The `tools/*` modules — Zod-typed tool definitions with the same names. These wrap the same underlying `SessionManager` methods in a `defineTool({ name, description, schema, handler })` shape.

The tools layer exists because some agent runtimes want MCP-style tool registration. The `browse-local install` command writes MCP-server entries that point at `browse-local start`, and the tools in `tools/index.ts` are the schema surface those runtimes see.

In a typical integration you do **not** touch the tools layer — you just call `browser.start(...)`, `browser.act(...)`, etc. directly.

## Why Stagehand LOCAL mode

`SessionManager` uses `@browserbasehq/stagehand`'s `V3` class with `env: "LOCAL"`. This means:

- We control Chrome ourselves (`chrome-launcher`).
- Stagehand connects to our Chrome over CDP.
- No Playwright in the core dependency graph — Stagehand brings its own CDP client.

This keeps the dependency tree small and avoids Playwright's "download a browser bundle" step. It also means any standard Chrome works — system Chrome, Chromium, a custom build.

## Logging

`createLogger(verbose)` returns a pino logger with `pino-pretty` transport:

- `verbose: 0` → `info` level
- `verbose: 1` → `debug` level
- `verbose: 2` → `debug` level (same as 1, kept for forward compatibility)

`SessionManager` and `Browser` both log lifecycle events (`Launching Chrome with context: ...`, `Browser session started`, `Browser session ended`, `Navigated to: ...`, etc.). Default is silent (`verbose: 0`); bump to 1 or 2 for debugging.

## Security

- **Local-only**: no network calls other than to the LLM provider and the URLs the agent navigates to.
- **No API keys in the library**: `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` come from the environment, not the library.
- **Context names are validated** against path traversal (`..`, `/`, `\`).
- **Profile locks**: Chrome's own profile lock prevents two Chrome processes from using the same context simultaneously, which is what makes context isolation meaningful.

## Extension points

### Adding a new `Browser` method

1. Add the method to `Browser` in `packages/core/src/server.ts`. Typically a one-liner that delegates to `SessionManager`.
2. Implement the underlying behavior in `SessionManager`. Throw descriptive `Error`s — agents read the message.
3. Add or extend a test in `packages/core/src/sessionManager.test.ts`. The existing tests mock `chrome-launcher` and `@browserbasehq/stagehand`; reuse that pattern.
4. If the method should also appear as an MCP tool, add a Zod-typed tool in `packages/core/src/tools/<name>.ts`, register it in `tools/index.ts`, and update the installer scripts if needed.
5. Document it in [docs/tools.md](tools.md).

### Adding a new CLI command

1. Create `packages/cli/src/commands/<name>.ts` exporting `new Command('<name>')`.
2. Register it in `packages/cli/src/program.ts` with `program.addCommand(...)`.

### Adding a new agent installer

1. Create `packages/cli/src/install/<agent>.ts` exporting `install<Agent>(options)`.
2. Add a case in `packages/cli/src/install/index.ts`.
3. Add the agent to the `--agent` choices in `packages/cli/src/commands/install.ts` (or default to it).

## Why no transport layer

The default flow is "embed `Browser` in your process". There is no stdio JSON-RPC server, no HTTP server, no MCP transport in the core. The shipped `browse-local start` command is a long-running process that holds a session open, but it does not expose an external API — it's the runtime that an MCP host launches and talks to.

If you want an HTTP / WebSocket / MCP-server wrapper, build it as a separate package on top of `Browser`. The `tools/` directory is a starting point: each tool is just a `(SessionManager, params) => Promise<ToolResult>` function, and a transport layer is a JSON-RPC loop on top.
