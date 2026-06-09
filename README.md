# browser-base

**Simple browser control plugin for coding agents.** Auto-creates contexts, detects login state, deterministic operations.

---

## One-Command Install

Give this to your Pi coding agent:

```
Install browser-base plugin:
  1. git clone https://github.com/rishi-ie/browser-base.git ~/.pi/agent/extensions/browser-base
  2. cd ~/.pi/agent/extensions/browser-base
  3. npm install
  4. Add "browser-base" to your extensions list in pi config
  5. Restart pi

Then tell me what you want to do on [Twitter/Instagram/GitHub/etc] and I'll control the browser for you.
```

That's it. Your agent can now browse the web with persistent login sessions.

---

## How It Works

```
You: "Do something on Twitter"
Agent: browser navigate https://twitter.com

Plugin:
  - Extracts "twitter" from URL → creates context if needed
  - Opens Chrome (visible window)
  - Navigates to twitter.com
  - Detects login state

If not logged in:
  → "Chrome is visible - please sign in manually"
  → You sign in once
  → Context saved forever

Next time:
  → Cookies present → automatically logged in
  → No re-signing needed
```

---

## Usage

**First time (need to sign in):**
```
You: navigate to twitter.com
Agent: Opening Twitter... Chrome window will appear.
  ⚠️ Login required. Please sign in manually in the browser, then tell me.

You: I'm logged in

You: post a tweet saying hello world
Agent: (types and clicks for you)

Done! Context saved.
```

**Next time:**
```
You: post another tweet
Agent: (already logged in, does it immediately)
```

---

## API

| Action | Description |
|--------|-------------|
| `navigate(url)` | Open URL, auto-create context from domain |
| `observe()` | Get all clickable/editable elements |
| `click(selector)` | Click element by selector |
| `type(selector, text)` | Type into input field |
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
| `status` | Get browser state |
| `end` | Close browser |

---

## Contexts

Contexts are Chrome profile directories:
```
browser-context/
├── twitter/     (your Twitter login)
├── instagram/   (your Instagram login)
├── github/     (your GitHub login)
```

They're created automatically from the URL domain. No manual setup.

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BROWSER_BASE_CONTEXT_DIR` | `./browser-context` | Where contexts are stored |
| `BROWSER_BASE_HEADFUL` | `true` | Chrome visible (for sign-in) |
| `BROWSER_BASE_CHROME_PORT` | `9222` | CDP port |

---

## Requirements

- Node.js 22+
- Chrome or Chromium
- Pi coding agent

---

## For Pi Config

Add to your extensions list:
```yaml
extensions:
  - browser-base
```

Or in your pi config file:
```json
{
  "extensions": ["browser-base"]
}
```