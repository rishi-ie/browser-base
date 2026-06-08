# Installation & setup

`browser-base` is a programmatic library (`@browserbase/local`) plus a CLI (`@browserbase/local-cli` / `browse-local`). Both run locally — there is no Docker image and no hosted service.

## Prerequisites

| Requirement | Why | Notes |
|-------------|-----|-------|
| **Node.js 22+** | The workspace is ESM with Node 22 type defs | `node --version` |
| **Chrome or Chromium** | `chrome-launcher` auto-detects; you can also point at a specific binary | macOS: `/Applications/Google Chrome.app`. Linux: `google-chrome` or `chromium-browser`. |
| **An LLM API key** | `act` / `observe` / `extract` are LLM-driven | Default is OpenAI. Anthropic works too via `BROWSER_BASE_MODEL=anthropic/...`. |

`navigate` does not need an LLM key; only the LLM-driven calls do.

## Install the library

```bash
npm install @browserbase/local
# or
pnpm add @browserbase/local
```

This gives you the `Browser` class, `resolveConfig`, `createBrowser`, and the rest of the public API. Use it directly from your own scripts or agents.

## Install the CLI

```bash
npm install -g @browserbase/local-cli
```

The CLI is published as the `browse-local` binary. Verify:

```bash
browse-local --version
browse-local --help
```

The CLI is a thin wrapper around the same `Browser` class. Every subcommand creates a `Browser`, calls one or more methods, and exits (or, for `start` and `use-context`, blocks until you send it a signal).

## The user pipeline

No matter how you intend to use browser-base, the flow is the same:

1. **Install** the library and / or CLI.
2. **Run `browse-local install`** in your project to create `.browser-base/contexts/default/` and a config file.
3. **Manually log in** by opening Chrome against the context dir.
4. **Set your LLM API key** (only needed for `act` / `observe` / `extract`).
5. **Drive the browser** from your script, agent, or CLI.

```bash
# 1. Install the CLI
npm install -g @browserbase/local-cli

# 2. Set up the project (creates .browser-base/contexts/default/ and AGENTS.md)
browse-local install

# 3. Open Chrome with the new profile and log in
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/.browser-base/contexts/default"
# ... log in to whatever site(s) you need, close Chrome ...

# 4. Set the API key
export OPENAI_API_KEY=sk-...

# 5. Drive the browser
browse-local navigate "https://github.com"
browse-local act "click the notifications bell"
```

## `browse-local install`

```bash
browse-local install [--project-dir <path>] [--agent <name>] \
                     [--default-context <name>] [--model <model>] \
                     [--dry-run]
```

The `install` command wires `browser-base` into the current project so any coding agent can drive Chrome. It is **project-level**, not global — it touches the project directory, not `~/.claude.json` or similar.

What it does:

1. Detects the project root (looks for `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` / `pom.xml` / `Gemfile` / `composer.json` / `.git`).
2. Creates `.browser-base/contexts/<defaultContext>/` (default: `default`).
3. Writes `.browser-base/browser-base.json` with the project's chosen default context and model.
4. Appends (or inserts) a `<!-- browser-base:start -->` ... `<!-- browser-base:end -->` section in `AGENTS.md` describing the CLI surface to the agent.
5. Prints a JSON summary to stdout and next-steps to stderr.

| Flag | Description | Default |
|------|-------------|---------|
| `--project-dir <path>` | Project root to install into | `.` |
| `--agent <name>` | `pi-agent`, `claude-code`, or `both` — controls the AGENTS.md content | `both` |
| `--default-context <name>` | Context directory to create | `default` |
| `--model <model>` | LLM model string to write into `browser-base.json` | `openai/gpt-4.1-mini` |
| `--dry-run` | Print what would be done without writing | — |

Example output (stdout, JSON):

```json
{
  "projectRoot": "/Users/rishi/work/myapp",
  "browserBaseDir": "/Users/rishi/work/myapp/.browser-base",
  "configPath": "/Users/rishi/work/myapp/.browser-base/browser-base.json",
  "contextsDir": "/Users/rishi/work/myapp/.browser-base/contexts",
  "defaultContext": "default",
  "model": "openai/gpt-4.1-mini",
  "agent": "both",
  "dryRun": false,
  "actions": [
    { "action": "create-dir", "target": ".../contexts/default", "status": "wrote" },
    { "action": "write-config", "target": ".../browser-base.json", "status": "wrote" },
    { "action": "update-AGENTS.md", "target": ".../AGENTS.md", "status": "wrote" }
  ],
  "nextSteps": [ ... ]
}
```

## Using it with a coding agent

`browser-base` is a plain Node process. The recommended way to use it with Pi, Claude Code, or any other coding agent is:

1. Run `browse-local install` once in the project (creates contexts dir, writes `AGENTS.md`).
2. Make sure the agent's environment has `OPENAI_API_KEY` (or whichever LLM key matches the model).
3. Let the agent shell out to the `browse-local` CLI.

The `AGENTS.md` block that `install` writes is the agent's "I know how to use browser-base" doc. It covers the one-shot commands, the long-running `start`, the context model, and how to log in.

### One-shot mode (the default)

Each of `act`, `navigate`, `observe`, `extract` starts a session, does the work, prints JSON, and tears the session down:

```bash
browse-local navigate "https://github.com"
browse-local act "click the sign-in button"
browse-local observe "find the search box"
browse-local extract "get the page title"
browse-local status
```

This is the simplest model. Trade-off: every call pays the cost of starting Chrome, but you never have to worry about session state.

### Long-running mode

For multi-step work, start a session once and reuse it:

```bash
# In one terminal (or backgrounded)
browse-local start --http-port 9223
# → prints JSON, blocks, exposes GET /status on :9223

# In the agent loop, hit /status to confirm the session is alive
# and use --context to drive a specific context

browse-local act --context github-main "click X"
browse-local navigate --context github-main "https://github.com"
```

`browse-local use-context <name>` is the long-running switch-context command: it ends the current session, starts a new one in the named context, and blocks until SIGINT. Use it when your agent needs to swap between accounts in the middle of a task.

### Embedding the library directly (no CLI)

You can skip the CLI entirely and use the `Browser` class from your own code:

```typescript
import { Browser, resolveConfig } from '@browserbase/local';

const browser = new Browser(resolveConfig({ contextDir: './browser-context' }));
await browser.start('github-main');
await browser.navigate('https://github.com');
await browser.act('click the notifications bell');
await browser.end();
```

This is the recommended path for new integrations: the `Browser` class is a plain async API and is much easier to test and reason about than shell-out commands.

## Environment variables

Configuration precedence: **CLI flags > env vars > project config (`browser-base.json`) > user config (`~/.browser-base/config.json`) > built-in defaults**.

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | API key for the default OpenAI model | — |
| `ANTHROPIC_API_KEY` | API key for Anthropic models | — |
| `BROWSER_BASE_MODEL` | LLM model string (`openai/gpt-4.1-mini`, `anthropic/claude-sonnet-4-6`, etc.) | `openai/gpt-4.1-mini` |
| `BROWSER_BASE_CONTEXT_DIR` | Directory holding browser contexts | `.browser-base/contexts` |
| `BROWSER_BASE_DEFAULT_CONTEXT` | Default context name | `default` |
| `BROWSER_BASE_HEADFUL` | Set to `1` to show the browser | `0` (headless) |
| `BROWSER_BASE_VERBOSE` | Pino log verbosity (`0`, `1`, `2`) | `0` |
| `BROWSER_BASE_BROWSER_PATH` | Path to Chrome binary | auto-detect |
| `BROWSER_BASE_KEEP_ALIVE` | `1` to keep the session alive after a one-shot command | unset |

`resolveConfig()` reads the `BROWSER_BASE_*` variables directly. The CLI's `loadProjectConfig()` (in `packages/cli/src/projectConfig.ts`) layers the project / user config files on top of that.

## CLI flag reference

The one-shot commands accept:

```bash
browse-local act|navigate|observe|extract \
  [--context <name>] \
  [--context-dir <path>] \
  [--model <model>] \
  [--headful] \
  [--keep-alive]
```

| Flag | Description |
|------|-------------|
| `--context <name>` | Context to use (overrides `defaultContext`) |
| `--context-dir <path>` | Override the contexts directory |
| `--model <model>` | Override the LLM model |
| `--headful` | Show the browser |
| `--keep-alive` | Don't end the session after the command (or set `BROWSER_BASE_KEEP_ALIVE=1`) |

`browse-local extract` additionally accepts `--schema <path>` (a path to a JSON file describing the expected output).

`browse-local start` additionally accepts `--http-port <port>` and `--http-host <host>` to expose a tiny status server at `GET /status`, `GET /healthz`.

## Troubleshooting

### Chrome not found

`chrome-launcher` searches standard install locations. If it can't find Chrome:

- **macOS**: usually `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- **Linux**: `google-chrome`, `chromium`, or `chromium-browser`
- **Windows**: `C:\Program Files\Google\Chrome\Application\chrome.exe`

Point at it explicitly:

```bash
browse-local start --browser-path "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

### Context not found

`browse-local start` and `browse-local act` (and the rest) throw if the context dir doesn't exist. Create it first:

```bash
browse-local context create <name>
```

### "Profile is already in use"

Chrome locks the user-data-dir while running. If you see this, another Chrome process has the same context open. Quit it (or `pkill -f chrome`) and retry.

### API key errors

`act` / `observe` / `extract` need a working LLM key. Verify:

```bash
echo "$OPENAI_API_KEY"     # should not be empty
```

For Anthropic:

```bash
export BROWSER_BASE_MODEL=anthropic/claude-sonnet-4-6
export ANTHROPIC_API_KEY=sk-ant-...
```

### `act` keeps failing on the same element

The LLM probably can't find the element. Call `observe` first to see what's on the page, then rephrase:

```bash
browse-local observe "find the search field"
# inspect the output, then:
browse-local act "click the input with placeholder 'Search GitHub'"
```

### The one-shot commands feel slow

Each one-shot pays the cost of starting Chrome (~1–2s) and tearing it down. For multi-step work, either use `--keep-alive` or start a long-running `browse-local start` in the background and reuse the session.

## Next steps

- [docs/tools.md](tools.md) — `Browser` class reference
- [docs/contexts.md](contexts.md) — context creation, pre-login, sharing
- [docs/architecture.md](architecture.md) — how the pieces fit together
- [examples/](../examples/) — runnable code
