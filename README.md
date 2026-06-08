# browser-base

A **pi agent plugin** that gives your LLM a local Chrome with persistent login sessions. It's a self-hosted alternative to the cloud Browserbase product — same capabilities, runs entirely on your machine.

---

## What it does

The LLM running in your pi agent uses `browser` to operate across the internet:
- Browse websites, click buttons, fill forms
- Log into sites once and stay logged in forever (via Chrome profiles)
- Switch between contexts (different accounts, different sites)
- Extract structured data from any page

---

## One-command install (pi agent)

```bash
pi install browserbase/browser-base
```

Or manually:
```bash
cp node_modules/@browserbase/local/pi-extension.ts ~/.pi/agent/extensions/browser-base.ts
```

Restart pi. The `browser` tool is now available to the LLM.

---

## Give this to your agent

```
I have browser-base installed. Use the browser tool to operate across the internet.

browser navigate to <url>          # open a URL
browser act "<instruction>"        # click/type using natural language
browser observe "<description>"   # find clickable elements
browser extract "<instruction>"   # get structured data
browser start                     # start browser session
browser end                       # close browser
browser use-context <name>        # switch to a different context
browser status                    # show current state
browser contexts                  # list available contexts

A "context" is a Chrome profile that stores cookies/logins.
Pre-login once, stay logged in forever.

Create a context:
  browse-local context create <name>

Pre-login (do once manually):
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --user-data-dir="$(pwd)/browser-context/<name>"
  # log in, close Chrome
```

---

## Setup (one-time)

```bash
# 1. Create a context
browse-local context create default

# 2. Pre-login (open Chrome against the context, log in, close)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/browser-context/default"
```

Done. The LLM will use this context and stay logged in.

---

## Contexts (multiple accounts/sites)

```bash
# Create separate contexts for different purposes
browse-local context create github
browse-local context create gmail
browse-local context create twitter

# Pre-login each one
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/browser-context/github"
# log in, close

# Agent switches between them
browser use-context github
browser use-context gmail
```

---

## Configuration

The extension uses defaults. To customize:

| Variable | Description | Default |
|----------|-------------|---------|
| `BROWSER_BASE_HEADFUL` | Show Chrome window | `false` (headless) |
| `BROWSER_BASE_CONTEXT_DIR` | Where contexts are stored | `./browser-context` |
| `BROWSER_BASE_DEFAULT_CONTEXT` | Default context name | `default` |
| `BROWSER_BASE_BROWSER_PATH` | Chrome binary path | auto-detect |

---

## Requirements

- Node.js 22+
- Chrome or Chromium installed
- pi agent

---

## How it works

```
pi agent (LLM)
    │
    └── browser tool
            │
            └── browser-base (pi extension)
                    │
                    ├── Browser class (@browserbase/local)
                    │       │
                    │       └── SessionManager
                    │               │
                    │               ├── Stagehand V3 (env: LOCAL)
                    │               │
                    │               └── Chrome via CDP
                    │
                    └── Chrome profiles (contexts)
                            └── cookies, logins, localStorage
```

The LLM calls `browser` tool → browser-base executes via local Chrome → results returned to LLM.

---

## Files

- `pi-extension.ts` — pi agent plugin (drop-in)
- `packages/core/src/tools/` — Agent integration tools
- `packages/cli/` — `browse-local` CLI for context management