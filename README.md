# browser-base

A **pi agent plugin** that gives your LLM a local Chrome with persistent login sessions. It's a self-hosted alternative to the cloud Browserbase product — same capabilities, runs entirely on your machine.

---

## Install (for pi agent)

```bash
# Clone into your extensions folder
git clone https://github.com/browserbase/browser-base.git ~/.pi/agent/extensions/browser-base

# Restart pi
```

That's it. The extension auto-loads. The LLM can now use the `browser` tool.

---

## Give this to your agent

```
Install browser-base:
  git clone https://github.com/browserbase/browser-base.git ~/.pi/agent/extensions/browser-base

Restart pi. Then use the browser tool to operate across the internet:

browser navigate to <url>          # open a URL
browser act "<instruction>"        # click/type using natural language
browser observe "<description>"   # find clickable elements
browser extract "<instruction>"   # get structured data
browser start                      # start browser session
browser end                        # close browser
browser use-context <name>         # switch to a different context
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

## Example: Research competitor pricing

**Task:** Research pricing for 3 SaaS competitors.

**Flow:**

```
User: Research pricing for Linear, Notion, and Asana. Summarize in a table.

Agent:
  # Create contexts for each competitor
  browse-local context create linear
  browse-local context create notion
  browse-local context create asana

  # Pre-login to Linear (do once, then agent uses it)
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --user-data-dir="$(pwd)/browser-context/linear"
  # log in, close

  # Now the agent can use them
  browser use-context linear
  browser navigate to https://linear.app/pricing
  browser extract "get all pricing tiers, prices, and features"
  # → Returns: { plans: [{ name: "Free", price: 0, ... }, { name: "Pro", price: 8, ... }] }

  browser use-context notion
  browser navigate to https://notion.so/pricing
  browser extract "get all pricing tiers, prices, and features"

  browser use-context asana
  browser navigate to https://asana.com/pricing
  browser extract "get all pricing tiers, prices, and features"

  # Agent synthesizes:
  | Product | Free | Pro | Enterprise |
  |---------|------|-----|------------|
  | Linear  | ✓    | $8/user/mo | Custom |
  | Notion  | ✓    | $8/user/mo | $15/user/mo |
  | Asana   | ✓    | $10.99/user/mo | Custom |
```

**Why this works:**
- Each context is a separate Chrome profile (cookies/logins persist)
- The agent doesn't need to re-login each session
- Extract returns structured JSON, not messy HTML
- Can handle any website, not just static pages

---

## Setup (one-time per context)

```bash
# Create context
browse-local context create default

# Pre-login (open Chrome, log in, close)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/browser-context/default"
```

Now the agent uses this context and stays logged in forever.

---

## Contexts (multiple accounts/sites)

```bash
# Create separate contexts for different purposes
browse-local context create github
browse-local context create gmail
browse-local context create twitter

# Pre-login each one (do once)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/browser-context/github"
# log in, close

# Agent switches between them
browser use-context github
browser navigate to github.com/user/repo
browser act "click the Settings tab"
```

---

## Configuration

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
User prompt
    │
    ▼
pi agent (LLM)
    │
    ├── "Research competitor pricing"
    │
    └── browser tool
            │
            └── browser-base extension
                    │
                    ├── Browser class
                    │       │
                    │       └── SessionManager
                    │               │
                    │               ├── Stagehand V3 (env: LOCAL)
                    │               │       └── LLM interprets page + actions
                    │               │
                    │               └── Chrome via CDP
                    │
                    └── Chrome profiles (contexts)
                            └── cookies, logins, localStorage
```

The LLM calls `browser` tool → browser-base drives Chrome → results returned to LLM.

---

## Files

- `pi-extension.ts` — pi agent plugin
- `packages/cli/` — `browse-local` CLI for context management
- `docs/example.md` — More usage examples