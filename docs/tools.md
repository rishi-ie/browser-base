# Browser API reference

The `Browser` class is the entire public surface of `@browserbase/local`. Every method delegates to a `SessionManager` that owns the Chrome process and Stagehand client.

```typescript
import { Browser, resolveConfig } from '@browserbase/local';

const browser = new Browser(resolveConfig({ contextDir: './browser-context' }));
```

All methods that touch the browser throw if no session is running. Start a session with `await browser.start(...)` first.

---

## `start(context?)`

Launch Chrome with a context. Idempotent: calling `start` while a session is already running returns the existing `SessionInfo` without relaunching.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `context` | `string` | No | Context name. Must be a directory under `contextDir`. Defaults to `config.defaultContext` (`"default"`). |

### Returns

`Promise<SessionInfo>`:

```typescript
interface SessionInfo {
  sessionId: string;   // == context name
  debugUrl: string;    // chrome://inspect#devtools/?ws=localhost:9222
  cdpUrl: string;      // ws://localhost:9222
  context: string;     // context name
}
```

### Throws

- `Error("Context '<name>' not found. Available contexts: ...")` — strict mode is the default; the directory must pre-exist.
- `Error("Invalid context name: '...'")` — empty, `.`, `..`, or contains `/` or `\`.
- `Error("Timeout waiting for Chrome remote debugging port")` — Chrome launched but CDP never came up (30s).

### Example

```typescript
// Use the configured default context
await browser.start();

// Use a specific context
const info = await browser.start('github-main');
console.log(info.debugUrl); // chrome://inspect#devtools/?ws=localhost:9222
```

---

## `end()`

Close Chrome and tear down the Stagehand client. Idempotent — calling on an already-stopped browser is a no-op.

### Parameters

None.

### Returns

`Promise<void>`.

### Example

```typescript
await browser.start('github-main');
// ...
await browser.end();
```

---

## `useContext(name)`

Switch to a different context. Ends the current session (if any) and starts a new one with the named context. The new context must already exist on disk.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | Context to switch to. Must be a directory under `contextDir`. |

### Returns

`Promise<SessionInfo>` — same shape as `start`. (Internally this is `end()` + `start(name)`.)

### Throws

- `Error("Context '<name>' not found. Available contexts: ...")`
- `Error("Invalid context name: '...'")`

### Example

```typescript
await browser.start('github-main');
await browser.navigate('https://github.com');
// ... do stuff ...

await browser.useContext('gmail');
// previous Chrome process is gone; a new one is up with the gmail profile
await browser.navigate('https://mail.google.com');
```

---

## `navigate(url)`

Load `url` in the active page of the running browser.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `url` | `string` | Yes | Full URL including protocol (e.g. `https://github.com`). |

### Returns

`Promise<void>`.

### Throws

- `Error("No browser session running")` — call `start` first.
- `Error("No pages found in browser context")` — Chrome started but has no pages (very rare).

### Example

```typescript
await browser.start('default');
await browser.navigate('https://example.com');
```

---

## `act(action)`

Perform an action in the browser using a natural-language description. The LLM finds the right element, then Stagehand dispatches the appropriate DOM event (click, type, select, press, etc.).

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `action` | `string` | Yes | Plain-English action, e.g. `"click the sign-in button"`, `"type 'hello' into the search field"`, `"press Enter"`. |

### Returns

`Promise<ActResult>`:

```typescript
interface ActResult {
  success: boolean;
  message: string;
  actionDescription: string;
  actions: Action[];
  cacheStatus?: 'HIT' | 'MISS';
}
```

`cacheStatus` is set by Stagehand when an action was replayed from the LLM's action cache.

### Throws

- `Error("No browser session running")`.
- Any error Stagehand surfaces (element not found, navigation interrupted, etc.) is propagated unchanged.

### Examples

```typescript
const r = await browser.act('click the sign-in button');
if (r.success) {
  console.log('Signed in:', r.message);
}

await browser.act("type 'rishi@example.com' into the email field");
await browser.act('press Enter');
await browser.act('check the remember-me checkbox');
```

If `act` fails because the LLM can't find the element, call `observe(...)` first to see what's actually on the page, then rephrase.

---

## `observe(instruction?)`

Find interactive elements on the current page. With an instruction, returns elements matching the description. Without one, returns all actionable elements on the page.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `instruction` | `string` | No | What to look for. Omit to enumerate every actionable element. |

### Returns

`Promise<Action[]>`:

```typescript
interface Action {
  selector: string;        // CSS / Playwright-style selector
  description: string;     // human-readable label
  method?: string;         // e.g. "click", "fill", "press"
  arguments?: string[];    // arguments the action would take
}
```

### Throws

- `Error("No browser session running")`.

### Examples

```typescript
// All actionable elements
const everything = await browser.observe();

// Filter to a kind of element
const inputs = await browser.observe('find all form inputs');
inputs.forEach((el) => console.log(el.description, '->', el.selector));

// Sanity-check before acting
const buttons = await browser.observe('find the submit button');
if (buttons.length === 0) {
  console.warn('No submit button found on this page');
}
```

---

## `extract(instruction?, schema?)`

Pull structured data off the current page using the LLM. The optional `schema` is a Zod schema (or a plain object Stagehand can interpret) for typed output.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `instruction` | `string` | No | What to extract. Omit to let the LLM decide what's important. |
| `schema` | `unknown` | No | Optional schema for typed output. See Stagehand docs. |

### Returns

`Promise<unknown>` — the shape depends on your instruction and schema. With no schema, expect a `Record<string, unknown>` (or similar) of the LLM's choice.

### Throws

- `Error("No browser session running")`.
- Any error Stagehand surfaces (page didn't load, schema validation failed, etc.) is propagated.

### Examples

```typescript
// Free-form
const data = await browser.extract('get the page title and main heading');
console.log(data);

// Typed
import { z } from 'zod';

const ProductSchema = z.object({
  name: z.string(),
  price: z.string(),
  inStock: z.boolean(),
});

const product = await browser.extract(
  'extract product details',
  ProductSchema,
);
```

---

## `getAvailableContexts()`

List context names — i.e. directories under `contextDir`. Hidden directories and non-directories are filtered out.

### Returns

`string[]` — context names, possibly empty.

### Example

```typescript
const contexts = browser.getAvailableContexts();
console.log('Available:', contexts); // ['default', 'github-main', 'gmail']
```

---

## `getDebugUrl()`

The Chrome DevTools inspection URL. Open in any Chrome to attach DevTools to the running session.

### Returns

`string` — e.g. `chrome://inspect#devtools/?ws=localhost:9222`.

### Example

```typescript
const info = await browser.start('github-main');
console.log(info.debugUrl); // same value
console.log(browser.getDebugUrl());
```

---

## `isActive()`

Whether a session is currently running.

### Returns

`boolean`.

### Example

```typescript
if (!browser.isActive()) {
  await browser.start('default');
}
```

---

## `getCurrentContext()`

The context name the running session is using. If no session is running, returns `config.defaultContext` (the configured default, which is `"default"` until you change it).

### Returns

`string`.

### Example

```typescript
await browser.start('github-main');
browser.getCurrentContext(); // 'github-main'

await browser.useContext('gmail');
browser.getCurrentContext(); // 'gmail'
```

---

## Errors

All throwing methods reject with a plain `Error` whose `.message` is meant to be human-readable. Agents should pattern-match on substrings like `"Context"` or `"No browser session running"` to decide what to do.

| Common message | Cause | Fix |
|----------------|-------|-----|
| `No browser session running` | Called `navigate` / `act` / `observe` / `extract` before `start` | Call `start` first |
| `Context '<x>' not found. Available contexts: ...` | Strict mode: directory must pre-exist | Run `browse-local context create <x>` first |
| `Invalid context name: '...'` | Empty name, `..`, or contains `/` `\` | Use a plain identifier |
| `Timeout waiting for Chrome remote debugging port` | Chrome failed to start cleanly | Check `BROWSER_BASE_HEADFUL=1` and inspect Chrome's stderr |

---

## Environment variables

The `Browser` instance is built from a `ResolvedConfig` (via `resolveConfig()`), which reads:

| Variable | Effect |
|----------|--------|
| `BROWSER_BASE_HEADFUL=1` | Run Chrome visible |
| `BROWSER_BASE_CONTEXT_DIR` | Override the contexts directory |
| `BROWSER_BASE_DEFAULT_CONTEXT` | Override the default context name |
| `BROWSER_BASE_MODEL` | LLM model string (e.g. `anthropic/claude-sonnet-4-6`) |
| `BROWSER_BASE_VERBOSE` | `0`, `1`, or `2` — pino log level |
| `BROWSER_BASE_BROWSER_PATH` | Path to a Chrome binary |
| `OPENAI_API_KEY` | Required when `BROWSER_BASE_MODEL` is an OpenAI model |
| `ANTHROPIC_API_KEY` | Required when `BROWSER_BASE_MODEL` is an Anthropic model |
