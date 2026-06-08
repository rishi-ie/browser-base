# browser-base

Local Chrome with persistent login sessions for coding agents.

---

## Give this to your agent

```
Install browser-base and add this to AGENTS.md:

## Browser

Use `browse-local` for browser automation with persistent logins:
- browse-local navigate "<url>"          # open a URL
- browse-local act "<instruction>"       # click/type using natural language
- browse-local observe "<description>"   # find clickable elements
- browse-local extract "<instruction>"  # get structured data
- browse-local context create <name>    # create a new context
- browse-local use-context <name>        # switch contexts

A "context" is a Chrome profile that stores cookies/logins. Pre-login once,
stay logged in forever.

Create and pre-login (do once):
  browse-local context create mycontext
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --user-data-dir="$(pwd)/browser-context/mycontext"
  # log in, close Chrome

Env: OPENAI_API_KEY=sk-... (required for act/observe/extract)
```

---

## Quick start

```bash
npm install github:browserbase/browser-base
browse-local context create default

# Pre-login once
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/browser-context/default"

# Done. Agent stays logged in forever.
```

---

## CLI

```bash
browse-local navigate "<url>"         # open URL (no LLM)
browse-local act "<action>"           # click/type (LLM)
browse-local observe "[instruction]"  # find elements
browse-local extract "[instruction]"  # get structured data
browse-local context create <name>    # create context
browse-local contexts                  # list contexts

# Flags: --context <name>, --headful, --keep-alive, --model <model>
```

---

## Programmatic API

```typescript
import { Browser, resolveConfig } from '@browserbase/local';

const browser = new Browser(resolveConfig({ contextDir: './browser-context' }));
await browser.start('default');
await browser.navigate('https://github.com');
await browser.act('click the sign in button');
await browser.end();
```

---

## Pi Agent

```bash
cp node_modules/@browserbase/local/pi-extension.ts ~/.pi/agent/extensions/browser-base.ts
# Restart pi. "browser" tool is now available.
```

The extension auto-registers: `browser` tool, `/browser-contexts`, `/browser-create-context` commands.

---

## Tools API (for other agents)

```typescript
import { createBrowserTool } from '@browserbase/local';

pi.registerTool(createBrowserTool({
  getBrowser: () => new Browser(resolveConfig({})),
}));
```

Or import individual tools: `createNavigateTool`, `createActTool`, `createObserveTool`, `createExtractTool`.

---

## Requirements

- Node.js 22+
- Chrome/Chromium
- `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`) for act/observe/extract