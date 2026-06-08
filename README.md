# browser-base

Give your coding agent a local Chrome with persistent login sessions. No cloud, no per-session billing, no MCP plumbing. The agent just runs `browse-local act "click sign in"` and it works.

browser-base is a programmatic `Browser` class + `browse-local` CLI. Stagehand V3 handles the LLM-to-browser translation.

---

## Give this to your agent

Copy and paste the following into your agent. It will set everything up automatically.

```
I have browser-base installed in this project. It gives me a local Chrome
with persistent login sessions via browser contexts (Chrome user profile dirs).

Use it like this:

  browse-local context create <name>           # create a new browser context
  browse-local navigate "<url>"               # open a URL (no LLM needed)
  browse-local act "<action>"                 # click/type using natural language
  browse-local observe "<instruction>"        # find actionable elements on page
  browse-local extract "<instruction>"        # extract structured data from page
  browse-local status                          # show current config and session state
  browse-local contexts                       # list available contexts

Key concepts:
- A "context" is a Chrome user profile dir (stores cookies, logins, localStorage)
- Create a context: browse-local context create <name>
- Pre-login by opening Chrome against the context dir manually, then close it
- The agent then uses that context and stays logged in across sessions
- Contexts are stored at ./browser-context/ by default

Browser class API (import from @browserbase/local):
  import { Browser, resolveConfig } from '@browserbase/local';
  const browser = new Browser(resolveConfig({ contextDir: './browser-context' }));
  await browser.start('context-name');        // launch Chrome
  await browser.navigate('https://...');
  await browser.act('click the button');
  await browser.observe('find the form');
  await browser.extract('get the page title');
  await browser.useContext('other-context');  // switch (restarts session)
  await browser.end();                        // close Chrome

Environment variables:
  OPENAI_API_KEY               (required for act/observe/extract)
  BROWSER_BASE_HEADFUL=1       (show Chrome window)
  BROWSER_BASE_MODEL=anthropic/claude-sonnet-4-5  (change LLM)
  BROWSER_BASE_CONTEXT_DIR     (default: ./browser-context)
```

---

## Agent integration

### Pi Agent

Add the system prompt above to your project's `AGENTS.md` (or create one). Pi Agent reads `AGENTS.md` in the project root.

```bash
# In your project directory:
browse-local install --agent pi-agent
```

Or manually:

```bash
# 1. Install from GitHub (no npm publish needed)
npm install github:rishi-ie/browser-base

# 2. Create a default context
browse-local context create default

# 3. Add to your project's AGENTS.md (or create it):
cat >> AGENTS.md << 'EOF'
## Browser

Use `browse-local` to control a local Chrome with persistent logins:
  browse-local act "click the sign-in button"
  browse-local navigate "https://github.com"
  browse-local observe "find the search box"
  browse-local extract "get the page title"
EOF

# 4. Pre-login (do this once manually):
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/browser-context/default"
# Log in, close Chrome. Session is now persisted.
```

### Claude Code

Claude Code reads `CLAUDE.md` in the project root. Add browser-base there:

```bash
# 1. Install
npm install github:rishi-ie/browser-base

# 2. Create context
browse-local context create default

# 3. Install into project
browse-local install --agent claude-code

# 4. Pre-login
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/browser-context/default"
```

### Cursor, VS Code, or any agent

```bash
npm install github:rishi-ie/browser-base
browse-local install --agent both
```

For agents without a dedicated installer, the copy-paste prompt above works universally.

---

## Quick install

```bash
# 1. Install the CLI
npm install github:rishi-ie/browser-base

# 2. Create a context (a Chrome user profile directory)
browse-local context create default

# 3. Pre-login manually (do this once)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/browser-context/default"
# Log in, complete 2FA, close Chrome. Session is now on disk.

# 4. Set your LLM API key
export OPENAI_API_KEY=sk-...

# 5. Use it
browse-local navigate "https://github.com"
browse-local act "click the sign in button"
```

---

## CLI reference

```bash
browse-local act "<action>"           # click/type using natural language
browse-local navigate "<url>"         # open a URL (no LLM needed)
browse-local observe "[instruction]"  # list actionable elements on page
browse-local extract "[instruction]"  # extract structured data from page
browse-local use-context <name>       # switch context (restarts session)
browse-local start                    # long-running session (block until SIGINT)
browse-local status                   # current config and session state
browse-local contexts                 # list available contexts
browse-local context create <name>    # create a new context directory
browse-local install                  # set up for a specific agent
```

**One-shot vs long-running:** `act`, `navigate`, `observe`, `extract` start a session, perform the action, then close Chrome. Use `start` (blocks) or `--keep-alive` flag to keep the session alive across multiple calls.

| Flag | Description |
|------|-------------|
| `--context <name>` | Use this context (overrides default) |
| `--headful` | Show the Chrome window |
| `--keep-alive` | Don't close Chrome after a one-shot command |
| `--model <model>` | LLM model (e.g. `openai/gpt-4.1-mini`) |

---

## Programmatic API

```typescript
import { Browser, resolveConfig } from '@browserbase/local';

const browser = new Browser(resolveConfig({
  contextDir: './browser-context',
  defaultContext: 'github-main',
  model: 'openai/gpt-4.1-mini',
  headful: false,
  verbose: 0,
}));

// Launch Chrome with a context (must already exist on disk)
const session = await browser.start('github-main');
// session: { sessionId, debugUrl, cdpUrl, context }

// Drive the browser
await browser.navigate('https://github.com');
const result = await browser.act('click the sign-in button');
const elements = await browser.observe('find the search box');
const data = await browser.extract('get the page title');

// Switch context (ends current session, starts new one)
await browser.useContext('gmail');

// Check state
browser.isActive();              // true
browser.getCurrentContext();     // 'gmail'
browser.getDebugUrl();            // chrome://inspect#...
browser.getAvailableContexts();  // ['default', 'github-main', 'gmail']

// Clean up
await browser.end();
```

All methods: `start(context?)`, `end()`, `useContext(name)`, `navigate(url)`, `act(action)`, `observe(instruction?)`, `extract(instruction?, schema?)`, `isActive()`, `getCurrentContext()`, `getDebugUrl()`, `getCdpUrl()`, `getAvailableContexts()`.

See [docs/tools.md](docs/tools.md) for the full reference.

---

## Contexts (persistent logins)

A **context** is a Chrome user profile directory. browser-base doesn't create the session — you do, by opening Chrome against the context dir once:

```bash
browse-local context create github-main
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/browser-context/github-main"
# Log in, close Chrome
```

Now the agent uses that context and stays logged in forever.

```bash
browse-local contexts                # list all contexts
browse-local context create <name>   # create a new one
browse-local act "click compose" --context github-main  # use a specific one
```

See [docs/contexts.md](docs/contexts.md) for the full guide.

---

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Required for `act`/`observe`/`extract` | — |
| `ANTHROPIC_API_KEY` | For Anthropic models | — |
| `BROWSER_BASE_HEADFUL` | `1` = show Chrome window | `0` (headless) |
| `BROWSER_BASE_MODEL` | LLM model (`provider/model`) | `openai/gpt-4.1-mini` |
| `BROWSER_BASE_CONTEXT_DIR` | Browser contexts directory | `./browser-context` |
| `BROWSER_BASE_DEFAULT_CONTEXT` | Default context name | `default` |
| `BROWSER_BASE_VERBOSE` | Log verbosity (`0`/`1`/`2`) | `0` |
| `BROWSER_BASE_BROWSER_PATH` | Path to Chrome binary | auto-detect |

---

## Requirements

- **Node.js 22+**
- **Chrome or Chromium** (auto-detected on macOS/Linux)
- **An LLM API key** for `act` / `observe` / `extract`

---

## Project structure

```
packages/
├── core/                    # @browserbase/local
│   └── src/
│       ├── server.ts        # Browser class (public API)
│       ├── sessionManager.ts # Chrome + Stagehand lifecycle
│       ├── config.ts        # resolveConfig / Config
│       └── index.ts         # public exports
└── cli/                     # @browserbase/local-cli
    └── src/
        ├── program.ts       # browse-local entry point
        └── commands/        # start, act, navigate, observe, etc.
```

---

## Docs & examples

- [docs/tools.md](docs/tools.md) — Browser class reference
- [docs/contexts.md](docs/contexts.md) — context management guide
- [docs/architecture.md](docs/architecture.md) — system design
- [examples/basic-usage.ts](examples/basic-usage.ts) — full lifecycle demo
- [examples/autonomous-agent.ts](examples/autonomous-agent.ts) — agent loop demo
- [examples/context-management.ts](examples/context-management.ts) — context switching demo

Run an example:

```bash
export OPENAI_API_KEY=sk-...
npx tsx examples/basic-usage.ts
```