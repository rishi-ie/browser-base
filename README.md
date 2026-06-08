# browser-base

Self-hosted browser infrastructure for AI coding agents. Give your agent a local Chrome with persistent login sessions — no cloud, no per-session billing, no MCP plumbing.

`browser-base` is a **programmatic API** (`Browser` class) plus a thin **CLI** (`browse-local`). Agents and scripts drive a real Chrome running on the same machine through natural-language `act` / `observe` / `extract` calls backed by [Stagehand](https://github.com/browserbase/stagehand).

---

## Quick Start

```bash
# 1. Install the CLI
npm install -g @browserbase/local-cli

# 2. Create a context (a Chrome user profile dir)
browse-local context create default

# 3. Manually log in to whatever you need
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/browser-context/default"

# 4. Set your LLM API key
export OPENAI_API_KEY=sk-...

# 5. Use it programmatically
```

```typescript
import { Browser, resolveConfig } from '@browserbase/local';

const browser = new Browser(resolveConfig({ contextDir: './browser-context' }));
await browser.start('default');
await browser.navigate('https://github.com');

const result = await browser.act('click the sign-in button');
const elements = await browser.observe('find the search box');
const data = await browser.extract('get the page title');

await browser.end();
```

---

## The user pipeline

browser-base is designed around **persistent login sessions**, not throwaway browsers.

### 1. Install

```bash
npm install -g @browserbase/local-cli
```

Or, if you only need the library:

```bash
npm install @browserbase/local
```

### 2. Create a context

A **context** is a Chrome user profile directory under `./browser-context/`. Each context is fully isolated (cookies, local storage, history).

```bash
browse-local context create github-main
```

This creates `./browser-context/github-main/`.

### 3. Manually log in

Open Chrome against the new context dir and log in:

```bash
# macOS
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/browser-context/github-main"

# Linux
google-chrome --user-data-dir=./browser-context/github-main
```

Log in, complete any 2FA, then close Chrome. The session is now persisted on disk.

### 4. Drive it programmatically

```typescript
import { Browser, resolveConfig } from '@browserbase/local';

const browser = new Browser(resolveConfig({ contextDir: './browser-context' }));

// Strict mode: the context must already exist on disk
await browser.start('github-main');
await browser.navigate('https://github.com');
await browser.act('open the notifications dropdown');
await browser.end();
```

See [examples/basic-usage.ts](examples/basic-usage.ts) for a runnable demo.

---

## Programmatic API

The `Browser` class is the public API. See [docs/tools.md](docs/tools.md) for the full reference.

```typescript
import { Browser, resolveConfig } from '@browserbase/local';

const browser = new Browser(resolveConfig({
  contextDir: './browser-context',
  defaultContext: 'github-main',
  model: 'openai/gpt-4.1-mini',
  headful: false,
  verbose: 0,
}));

// Lifecycle
await browser.start('github-main');         // launch Chrome with this context
await browser.end();                         // close everything (idempotent)
await browser.useContext('gmail');           // switch contexts (restarts session)

// Driving the browser
await browser.navigate('https://github.com');
const result  = await browser.act('click the sign-in button');
const items   = await browser.observe('find the search box');
const payload = await browser.extract('get the page title', optionalSchema);

// Introspection
browser.isActive();             // true / false
browser.getCurrentContext();     // 'github-main'
browser.getDebugUrl();           // chrome://inspect#...
browser.getAvailableContexts();  // ['default', 'github-main', 'gmail']
```

`resolveConfig` merges your options with environment variables and built-in defaults. The only required field is `contextDir`.

---

## CLI reference

The `browse-local` CLI is a thin wrapper around the same `Browser` class.

```bash
browse-local start                  # long-running process that keeps a session alive
browse-local contexts               # list available contexts
browse-local context create <name>  # create a new context dir
browse-local install                # install into Claude Desktop, Cursor, etc.
```

`browse-local start` is what agents run when they need an MCP server. It boots the same `Browser` class and exposes a long-lived session.

```bash
browse-local start \
  --context-dir ./browser-context \
  --default-context github-main \
  --headful \
  --model openai/gpt-4.1-mini \
  --verbose 1
```

| Flag | Description | Default |
|------|-------------|---------|
| `--context-dir <path>` | Directory holding browser contexts | `./browser-context` |
| `--default-context <name>` | Context to start with | `default` |
| `--headful` | Show the browser window | headless |
| `--model <model>` | LLM model string (e.g. `openai/gpt-4.1-mini`) | `openai/gpt-4.1-mini` |
| `--verbose <0\|1\|2>` | Logging verbosity | `0` |
| `--browser-path <path>` | Path to Chrome binary | auto-detect |
| `--chrome-port <port>` | Chrome remote debugging port | `9222` |

---

## Context management

A **context** is just a directory on disk under `<contextDir>/<name>/`. The directory is given to Chrome as `--user-data-dir`, so cookies, local storage, history, and saved logins persist between sessions.

```bash
browse-local contexts
# Available contexts:
#   - default
#   - github-main
#   - gmail

browse-local context create stripe-dashboard
# Created context 'stripe-dashboard' at /abs/path/browser-context/stripe-dashboard
```

**Strict mode is the default.** `browser.start('nonexistent')` throws — the directory must exist. This is intentional: contexts are pre-loaded with manual logins, and silent auto-creation leads to confusing "why am I not logged in" bugs.

Switch contexts at runtime:

```typescript
await browser.useContext('gmail');
```

This ends the current session, then starts a new one with the named context.

See [docs/contexts.md](docs/contexts.md) for the full guide: backup, share, isolate, and re-login.

---

## Environment variables

Configuration is resolved as **CLI options > env vars > defaults**.

| Variable | Description | Default |
|----------|-------------|---------|
| `BROWSER_BASE_CONTEXT_DIR` | Browser context directory | `./browser-context` |
| `BROWSER_BASE_DEFAULT_CONTEXT` | Default context name | `default` |
| `BROWSER_BASE_HEADFUL` | Set to `1` to show the browser | `0` (headless) |
| `BROWSER_BASE_MODEL` | LLM model string (provider/name) | `openai/gpt-4.1-mini` |
| `BROWSER_BASE_VERBOSE` | Logging verbosity (0, 1, 2) | `0` |
| `BROWSER_BASE_BROWSER_PATH` | Path to Chrome binary | auto-detect |
| `OPENAI_API_KEY` | Required for default model | — |
| `ANTHROPIC_API_KEY` | Required for Anthropic models | — |

The `resolveConfig()` function reads these automatically. See [examples/.env.example](examples/.env.example) for a template.

---

## Architecture

```
Agent / script
     │
     │  new Browser(resolveConfig(...))
     ▼
┌────────────────────────────────────────────────────────┐
│  Browser  (packages/core/src/server.ts)                │
│                                                        │
│  - start / end / useContext                            │
│  - navigate / act / observe / extract                  │
│  - getAvailableContexts / getDebugUrl / isActive       │
└────────────────────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────────────────┐
│  SessionManager  (packages/core/src/sessionManager.ts) │
│                                                        │
│  - launches Chrome via chrome-launcher                 │
│  - drives Chrome via @browserbasehq/stagehand (V3,     │
│    env: "LOCAL", connected over CDP)                   │
│  - owns the active context name and lifetime           │
└────────────────────────────────────────────────────────┘
     │
     ▼
   Chrome (local process, --user-data-dir=<context>)
```

Key files:
- `packages/core/src/server.ts` — `Browser` class
- `packages/core/src/sessionManager.ts` — Chrome lifecycle + Stagehand
- `packages/core/src/config.ts` — `resolveConfig` / `Config` / `ResolvedConfig`
- `packages/core/src/index.ts` — public exports
- `packages/cli/src/program.ts` — `browse-local` entry point
- `packages/cli/src/commands/*.ts` — `start`, `contexts`, `context create`, `install`

See [docs/architecture.md](docs/architecture.md) for the deep dive.

---

## Requirements

- **Node.js 22+** (the workspace uses ESM + Node 22 type definitions)
- **Chrome or Chromium** on `PATH` or at a known location (`chrome-launcher` auto-detects on macOS / Linux)
- **An LLM API key** for `act` / `observe` / `extract` (default model: `openai/gpt-4.1-mini`; also supports Anthropic via `BROWSER_BASE_MODEL=anthropic/...`)

---

## Documentation

- [docs/tools.md](docs/tools.md) — `Browser` class reference (every method, parameter, return value)
- [docs/install.md](docs/install.md) — install for Pi Agent, Claude Code, Cursor, VS Code, generic agents
- [docs/contexts.md](docs/contexts.md) — context creation, pre-login workflow, sharing
- [docs/architecture.md](docs/architecture.md) — system design, request flow, components
- [docs/README.md](docs/README.md) — docs index

## Examples

- [examples/basic-usage.ts](examples/basic-usage.ts) — full lifecycle (start → navigate → act → observe → extract → end)
- [examples/context-management.ts](examples/context-management.ts) — listing, creating, and switching contexts
- [examples/autonomous-agent.ts](examples/autonomous-agent.ts) — multi-step agent loop

Run with `npx tsx examples/<file>.ts` after creating a context and exporting `OPENAI_API_KEY`.

---

## Contributing

```bash
# Build both packages
pnpm install
pnpm build

# Run tests
cd packages/core && pnpm test

# Lint
pnpm lint
```

The workspace is a pnpm monorepo (`packages/core`, `packages/cli`). The public surface is:

- `@browserbase/local` — the `Browser` class and friends (`packages/core/src/index.ts`)
- `@browserbase/local-cli` — the `browse-local` binary

When adding a new method to `Browser`:

1. Implement it in `packages/core/src/server.ts` (delegating to `SessionManager`)
2. Add the underlying behavior in `packages/core/src/sessionManager.ts`
3. Add or update a test in `packages/core/src/sessionManager.test.ts`
4. Update [docs/tools.md](docs/tools.md)

---

## License

MIT
