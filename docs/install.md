# Installation & setup

`browser-base` is a programmatic library plus a CLI. There is no Docker image and no hosted service — everything runs on your machine.

## Prerequisites

| Requirement | Why | Notes |
|-------------|-----|-------|
| **Node.js 22+** | The workspace is ESM with Node 22 type defs | `node --version` |
| **Chrome or Chromium** | `chrome-launcher` auto-detects; you can also point at a specific binary | macOS: `/Applications/Google Chrome.app`. Linux: `google-chrome` or `chromium-browser`. |
| **An LLM API key** | `act` / `observe` / `extract` are LLM-driven | Default is OpenAI. Anthropic works too via `BROWSER_BASE_MODEL=anthropic/...`. |

`navigate` does not need an LLM key; only the LLM-driven tools do.

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

The CLI is a thin wrapper around the same `Browser` class. It exists for two reasons:

1. To give agent runtimes (Claude Code, Pi, etc.) a single `browse-local start` command they can spawn.
2. To manage contexts from the terminal (`browse-local context create ...`).

## The user pipeline

No matter how you intend to use browser-base, the flow is the same:

1. **Install** the library and / or CLI.
2. **Create a context** (`browse-local context create <name>`).
3. **Manually log in** by opening Chrome against the new context dir.
4. **Set your LLM API key** (only needed for `act` / `observe` / `extract`).
5. **Drive the browser** from your script, agent, or CLI.

```bash
# 1. Install
npm install -g @browserbase/local-cli

# 2. Create a context
browse-local context create github-main

# 3. Open Chrome with the new profile and log in
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/browser-context/github-main"
# ... log in to GitHub, complete 2FA, close Chrome ...

# 4. Set the API key
export OPENAI_API_KEY=sk-...

# 5. Use it
```

## Using it with an agent runtime

`browser-base` is a plain Node process — there is no MCP, no stdio protocol, no HTTP service. Agent runtimes are expected to embed the `Browser` class directly (or shell out to `browse-local start` if they need a long-lived MCP host).

### Pi Agent

Pi loads MCP servers from `~/.pi/agent/mcp.json` (or a project-local equivalent). Add a `browser-base` entry that runs the CLI in long-lived mode:

```json
{
  "mcpServers": {
    "browser-base": {
      "command": "browse-local",
      "args": ["start", "--context-dir", "./browser-context"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key-here"
      }
    }
  }
}
```

`browse-local start` boots the `Browser` and blocks until SIGINT, so the process stays up for the lifetime of the agent session.

### Claude Code

Claude Code supports MCP servers through `claude_desktop_config.json` (Claude Desktop) or its own settings. Add:

```json
{
  "mcpServers": {
    "browser-base": {
      "command": "browse-local",
      "args": ["start", "--context-dir", "./browser-context"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key-here"
      }
    }
  }
}
```

Or use the auto-installer:

```bash
browse-local install --agent claude-desktop
```

This writes the same config to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `~/.config/Claude/claude_desktop_config.json` (Linux). Restart Claude Desktop afterwards.

### Cursor

Add to `~/.cursor/mcp.json`:

```json
[
  {
    "mcpServer": {
      "command": "browse-local",
      "args": ["start", "--context-dir", "./browser-context"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key-here"
      }
    }
  }
]
```

Or auto-install:

```bash
browse-local install --agent cursor
```

### VS Code

VS Code needs the [MCP extension](https://marketplace.visualstudio.com/items?itemName=modelcontextprotocol.modelcontextprotocol). Add to your VS Code MCP settings (or `.vscode/settings.json`):

```json
{
  "mcpServers": {
    "browser-base": {
      "command": "browse-local",
      "args": ["start", "--context-dir", "./browser-context"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key-here"
      }
    }
  }
}
```

Or auto-install:

```bash
browse-local install --agent vscode
```

### Generic agents (any MCP host)

For any host that can spawn a process and talk MCP, point it at `browse-local start`:

```json
{
  "mcpServers": {
    "browser-base": {
      "command": "browse-local",
      "args": ["start", "--context-dir", "./browser-context"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key-here"
      }
    }
  }
}
```

### Embedding the library directly (no MCP)

You can skip the CLI entirely and use the `Browser` class from your own code:

```typescript
import { Browser, resolveConfig } from '@browserbase/local';

const browser = new Browser(resolveConfig({ contextDir: './browser-context' }));
await browser.start('github-main');
await browser.navigate('https://github.com');
await browser.act('click the notifications bell');
await browser.end();
```

This is the recommended path for new integrations: the `Browser` class is a plain async API and is much easier to test and reason about than an MCP transport.

## Environment variables

Configuration precedence: **CLI flags > env vars > built-in defaults**.

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | API key for the default model | — |
| `ANTHROPIC_API_KEY` | API key for Anthropic models | — |
| `BROWSER_BASE_MODEL` | LLM model string (`openai/gpt-4.1-mini`, `anthropic/claude-sonnet-4-6`, etc.) | `openai/gpt-4.1-mini` |
| `BROWSER_BASE_CONTEXT_DIR` | Directory holding browser contexts | `./browser-context` |
| `BROWSER_BASE_DEFAULT_CONTEXT` | Default context name | `default` |
| `BROWSER_BASE_HEADFUL` | Set to `1` to show the browser | `0` (headless) |
| `BROWSER_BASE_VERBOSE` | Pino log verbosity (`0`, `1`, `2`) | `0` |
| `BROWSER_BASE_BROWSER_PATH` | Path to Chrome binary | auto-detect |

`browse-local start` also runs `dotenv.config()` before `resolveConfig`, so a `.env` in your CWD is loaded automatically. See [examples/.env.example](../examples/.env.example) for a full template.

## CLI flag reference

```bash
browse-local start \
  --context-dir ./browser-context \
  --default-context github-main \
  --headful \
  --model openai/gpt-4.1-mini \
  --verbose 1 \
  --chrome-port 9222 \
  --browser-path /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
```

| Flag | Description | Default |
|------|-------------|---------|
| `--context-dir <path>` | Directory holding browser contexts | `./browser-context` |
| `--default-context <name>` | Context to start with | `default` |
| `--headful` | Show the browser window | headless |
| `--model <model>` | LLM model string | `openai/gpt-4.1-mini` |
| `--verbose <0\|1\|2>` | Logging verbosity | `0` |
| `--browser-path <path>` | Path to Chrome binary | auto-detect |
| `--chrome-port <port>` | Chrome remote debugging port | `9222` |

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

`browser.start('x')` throws if `x` doesn't exist on disk. Create it first:

```bash
browse-local context create x
```

### "Profile is already in use"

Chrome locks the user-data-dir while running. If you see this, another Chrome process has the same context open. Quit it (or run `browse-local end` / `kill` the lingering `chrome` process) and retry.

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

The LLM probably can't find the element. Call `observe(...)` first to see what's on the page, then rephrase the action:

```typescript
const elements = await browser.observe('find the search field');
console.log(elements);
// then rephrase based on what you see
await browser.act('click the input with placeholder "Search GitHub"');
```

### `browse-local start` is running but nothing is happening

The command is **meant to be long-lived**. It blocks on a `Promise` so the process stays alive for the agent runtime to talk to. To exercise the API, run a separate script that imports `@browserbase/local` and uses the `Browser` class — or use the install command to register the CLI as an MCP server with your agent of choice.

## Next steps

- [docs/tools.md](tools.md) — `Browser` class reference
- [docs/contexts.md](contexts.md) — context creation, pre-login, sharing
- [docs/architecture.md](architecture.md) — how the pieces fit together
- [examples/](../examples/) — runnable code
