# browser-base

A **pi agent plugin** that gives your LLM a local Chrome with persistent login sessions. Clone it, restart pi, done.

---

## Install

```bash
git clone https://github.com/rishi-ie/browser-base.git ~/.pi/agent/extensions/browser-base
```

Restart pi. The `browser` tool is now available to the LLM.

---

## Give this to your agent

```
Install browser-base:
  git clone https://github.com/rishi-ie/browser-base.git ~/.pi/agent/extensions/browser-base

Then restart pi.

Use the browser tool to operate across the internet:

browser navigate to <url>            # open a URL
browser act "<instruction>"          # click/type using natural language
browser observe "<description>"      # find clickable elements
browser extract "<instruction>"      # get structured data (returns JSON)
browser use-context <name>           # switch to a different context
browser status                        # show current state
browser contexts                      # list available contexts

A "context" is a Chrome profile (stores cookies/logins).
Pre-login once, stay logged in forever.

Create a context:  browse-local context create <name>
Pre-login:         "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --user-data-dir="$(pwd)/browser-context/<name>"
```

---

## Example: Research competitor pricing

```
User: Research pricing for Linear, Notion, and Asana. Summarize in a table.

Agent:
  # Setup (one-time)
  browse-local context create linear
  browse-local context create notion
  browse-local context create asana
  # User pre-logins each context once

  # Research
  browser use-context linear
  browser navigate to https://linear.app/pricing
  browser extract "get all pricing tiers, prices, and features"
  # → { plans: [{ name: "Pro", price: 8, ... }] }

  browser use-context notion
  browser navigate to https://notion.so/pricing
  browser extract "get all pricing tiers, prices, and features"

  browser use-context asana
  browser navigate to https://asana.com/pricing
  browser extract "get all pricing tiers, prices, and features"

  # Synthesize
  | Product | Free | Pro    | Enterprise |
  |---------|------|--------|------------|
  | Linear  | ✓    | $8/mo  | Custom     |
  | Notion  | ✓    | $8/mo  | $15/mo     |
  | Asana   | ✓    | $11/mo | Custom     |
```

---

## Setup (one-time)

```bash
# Create a context
browse-local context create default

# Pre-login (do this once, then forget it)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/browser-context/default"
# log in, close Chrome

# Done. Agent stays logged in forever.
```

---

## Requirements

- Node.js 22+
- Chrome or Chromium
- pi agent

---

## Architecture

```
pi agent (LLM)
    │
    └── browser tool
            │
            └── browser-base (pi extension)
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