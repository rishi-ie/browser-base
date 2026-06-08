# Browser contexts

A **context** is the unit of session persistence in `browser-base`. It is a directory on disk that Chrome uses as its `--user-data-dir`, so cookies, local storage, history, and saved logins survive across runs.

## What a context is

```
browser-context/
├── default/           # default context
├── github-main/       # pre-logged-in GitHub
├── gmail/             # pre-logged-in Gmail
└── stripe-dashboard/  # pre-logged-in Stripe
```

Each entry is a complete Chrome user profile. `browser-base` does not invent a storage format — it just hands the directory to Chrome, so anything Chrome normally persists in a profile is available to your agent.

## Why contexts

Without contexts, every browser session starts logged out. With them, you do the login dance **once** and reuse the session forever:

1. Create a context (`browse-local context create github-main`)
2. Open Chrome against it, log in, close Chrome
3. From now on, `browser.start('github-main')` opens Chrome already logged in

This is the entire value proposition. It lets agents do real work on sites that require authentication (GitHub, Gmail, dashboards, internal tools) without re-authing on every run.

## Strict mode

Strict mode is the default and the only mode.

- `browser.start('nonexistent')` throws `Context 'nonexistent' not found. Available contexts: ...`
- `browser.useContext('nonexistent')` throws the same
- `browse-local context create` is the only way to make a context exist

The rationale: silent auto-creation leads to confusing "why am I logged out" bugs. If the agent says it needs `github-main` and `github-main` isn't on disk, fail loud and tell the human.

## Creating a context

From the CLI:

```bash
browse-local context create github-main
# Created context 'github-main' at /abs/path/browser-context/github-main
```

This creates an empty directory. Chrome will populate it the first time the context starts.

You can also create one by hand:

```bash
mkdir -p browser-context/github-main
```

There is no schema or metadata file — the directory itself is the context.

## Pre-login workflow

The recommended way to load a context with a real session:

### 1. Create the context

```bash
browse-local context create github-main
```

### 2. Open Chrome with that profile

The exact path to Chrome varies by platform:

```bash
# macOS
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/browser-context/github-main"

# Linux
google-chrome --user-data-dir=./browser-context/github-main

# Windows (PowerShell)
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --user-data-dir=".\browser-context\github-main"
```

Chrome opens with a fresh, isolated profile. Crucially, **do not use your regular Chrome** — the `--user-data-dir` flag is what gives you isolation.

### 3. Log in manually

Navigate to the site, log in with your credentials, complete 2FA / captcha / whatever. Treat this exactly like a normal login. The cookies and tokens go into the context directory.

### 4. Close Chrome completely

Quit Chrome (Cmd+Q on macOS, File → Exit on Linux/Windows) — don't just close the window. The session is now persisted to disk.

### 5. Use it

```typescript
import { Browser, resolveConfig } from '@browserbase/local';

const browser = new Browser(resolveConfig({ contextDir: './browser-context' }));
await browser.start('github-main');
await browser.navigate('https://github.com'); // already logged in
```

## Listing contexts

CLI:

```bash
browse-local contexts
# Available contexts:
#   - default
#   - github-main
#   - gmail
```

Programmatic:

```typescript
console.log(browser.getAvailableContexts()); // ['default', 'github-main', 'gmail']
```

The CLI command reads directories under `--context-dir` (default `./browser-context`). Hidden directories and non-directories are filtered out.

## Switching contexts at runtime

```typescript
await browser.start('github-main');
await browser.navigate('https://github.com');
// ... interact ...

await browser.useContext('gmail');
// previous Chrome process is gone; new one starts with the gmail profile
await browser.navigate('https://mail.google.com');
```

`useContext` ends the current session, then starts a new one with the named context. The previous context's cookies / storage are untouched on disk — they remain there for next time.

You cannot have two contexts running at once. Chrome locks its `--user-data-dir` while running, so the only safe way to "switch" is end + start.

## Where context data lives

`browser-base` resolves `contextDir` from `BROWSER_BASE_CONTEXT_DIR` (or the `--context-dir` flag, or `./browser-context` by default). Each context is `<contextDir>/<name>/`.

Typical layout on disk:

```
browser-context/github-main/
├── Default/
│   ├── Cookies                # cookies.sqlite
│   ├── Login Data             # saved logins
│   ├── Preferences
│   └── ...
├── Local Storage/
│   └── leveldb/
├── IndexedDB/
├── Cache/
└── ...
```

This is just a standard Chrome profile. You can back it up, copy it, version-control it (carefully — it includes secrets), or open it in Chrome to inspect.

## Backup & share

A context is just a directory — back it up like any other:

```bash
# Backup
tar -czf github-main.tar.gz browser-context/github-main/

# Restore on another machine
tar -xzf github-main.tar.gz -C browser-context/
```

Things to know when sharing contexts across machines:

- Some sites fingerprint the browser profile and may prompt for re-auth.
- Some cookies are bound to a specific IP / machine and will be invalidated on move.
- 2FA sessions often have a TTL shorter than your backup interval.

## Deleting a context

```bash
rm -rf browser-context/old-context
```

There is no `browse-local context delete` — just remove the directory. Strict mode will then refuse to `start` or `useContext` the missing name, which is the desired behavior.

## Common patterns

### Per-site contexts

One context per site or per account:

```
browser-context/
├── github-personal/
├── github-work/
├── gmail-personal/
└── gmail-work/
```

Use this when you have multiple accounts on the same service and need them isolated.

### Per-task contexts

One context per category of work:

```
browser-context/
├── research/      # general web research
├── shopping/      # price comparisons
└── social/        # social posting
```

Use this to keep cookies / cache scoped to a workflow.

### Per-environment contexts

One context per environment when testing:

```
browser-context/
├── dev-local/
├── staging/
└── production-readonly/
```

Use this to avoid mixing cookies between dev and prod.

## Naming rules

Context names are validated in `SessionManager.validateContextName`:

- Must be non-empty
- Cannot be `.` or `..`
- Cannot contain `/` or `\`

This is a security check to prevent path traversal. Stick to `[a-z0-9-_]`.

## Troubleshooting

### "Context 'x' not found"

`browse-local context create x` first.

### "Profile is already in use"

Another Chrome process has the same context open. Close it (`pkill -f chrome` is heavy-handed but works), then retry.

### Logged out for no apparent reason

A few possibilities:

- The site's session cookie expired. Open Chrome against the context dir, re-auth, close.
- The context directory was deleted or moved.
- A different Chrome instance grabbed the profile. Check `ps aux | grep -i chrome`.

### Cookies reset every run

Make sure you are not running two `Browser` instances against the same `contextDir` simultaneously. The last one to launch will clobber.

### Need a fresh session for one task

Create a throwaway context:

```bash
browse-local context create temp-test
```

Use it, then `rm -rf browser-context/temp-test` when done.

## Next steps

- [docs/tools.md](tools.md) — `Browser` class reference, including `useContext` and `start`
- [docs/install.md](install.md) — full install / setup guide
- [docs/architecture.md](architecture.md) — how contexts fit into the system
