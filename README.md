# browser-base

**Simple browser control plugin for coding agents.**

---

## What it does

1. User asks agent to do something on Twitter/Instagram
2. Agent uses browser plugin
3. Plugin opens Chrome (visible), auto-creates context from URL domain
4. If not logged in → Chrome window is visible, user signs in manually
5. Context is saved automatically
6. Next time → no re-signing needed

---

## Install

```bash
# Copy the extension to pi
cp pi-extension.ts ~/.pi/agent/extensions/browser-base.ts

# Update pi config to load the extension
# (depends on your pi config format)

# Restart pi
```

That's it. No CLI, no setup.

---

## How it works

**First time (user needs to sign in):**
```
User: "Do something on Twitter"
Agent: browser navigate https://twitter.com

Plugin:
  - Extracts "twitter" from URL
  - Auto-creates browser-context/twitter/ directory
  - Opens Chrome (visible)
  - Navigates to twitter.com
  - Detects not logged in
  - Says: "Chrome is visible - please sign in manually"

User: (sees Chrome, signs in manually)
User: "I'm logged in"

Agent: browser click .tweet-button
Agent: browser type [data-testid="tweet"] "Hello world"
Agent: browser click [data-testid="tweetButton"]

Done! Context saved automatically.
```

**Next time:**
```
User: "Do something on Twitter"
Agent: browser navigate https://twitter.com

Plugin:
  - Uses existing browser-context/twitter/
  - Cookies are there → logged in automatically
  - User doesn't need to sign in again
```

---

## API

| Action | Description |
|--------|-------------|
| `navigate(url)` | Open URL, auto-create context from domain |
| `observe()` | Get all clickable/editable elements |
| `click(selector)` | Click element |
| `type(selector, text)` | Type into input |
| `press(key)` | Press keyboard key |
| `hover(selector)` | Hover over element |
| `select(selector, value)` | Select dropdown option |
| `scroll(direction)` | Scroll page |
| `waitFor(selector)` | Wait for element |
| `extract(selector)` | Get text from element |
| `evaluate(script)` | Run JavaScript |
| `getUrl()` | Get current URL |
| `getTitle()` | Get page title |
| `screenshot()` | Take screenshot |
| `has(selector)` | Check if element exists |
| `status` | Get browser state |
| `end` | Close browser |

---

## Example conversation

```
You: navigate to twitter.com
Agent: Opening Twitter... (Chrome window will appear)
  ⚠️ Login required: No auth cookies detected. 
  Chrome is visible - please sign in manually, then tell me when done.

You: I'm logged in

You: post a tweet saying hello world
Agent: Let me see what's on the page...
  Found 47 interactive elements:
  [1] div [data-testid="tweetTextarea"] "What's happening?" clickable, editable
  [2] button [data-testid="tweetButtonInline"] "Post" clickable
  
Agent: Typing...
Agent: Clicking Post...

Done!
```

---

## Contexts

Contexts are just Chrome profile directories:
```
browser-context/
├── twitter/
│   └── (Chrome profile data)
├── instagram/
│   └── (Chrome profile data)
├── github/
│   └── (Chrome profile data)
```

They're created automatically from the URL domain. No manual setup needed.

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BROWSER_BASE_CONTEXT_DIR` | `./browser-context` | Where contexts are stored |
| `BROWSER_BASE_CHROME_PORT` | `9222` | CDP port |
| `BROWSER_BASE_BROWSER_PATH` | auto | Path to Chrome |

Default is headful=true (Chrome visible) so you can sign in when needed.

---

## Requirements

- Node.js 22+
- Chrome or Chromium
- pi agent