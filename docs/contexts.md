# Browser Contexts

A comprehensive guide to browser contexts in browser-base.

## What is a Context?

A **browser context** is a Chrome user profile directory. It stores:

- Cookies and session data
- Local storage
- Cache
- Browsing history
- Saved logins and passwords

Think of it as a "logged-in browser" that persists across sessions.

## Why Contexts?

Without contexts, every browser session starts fresh. You need to:

1. Open the browser
2. Navigate to a site
3. Log in (enter credentials, 2FA, etc.)
4. Do your task
5. Close the browser
6. Next session: repeat

With contexts, you do steps 1-4 once, then all subsequent sessions are already logged in.

## Directory Structure

```
browser-context/
├── default/           # Default context
│   ├── Default/
│   └── Local Storage/
├── github-logged-in/  # Pre-logged-in GitHub
│   ├── Default/
│   └── Local Storage/
└── work-account/      # Work browser profile
    ├── Default/
    └── Local Storage/
```

Each context is a complete Chrome profile directory.

---

## Managing Contexts

### Create a Context

**Using CLI:**

```bash
browse-local context create github-logged-in
```

**Programmatically:**

The context is just a directory. You can also create it manually:

```bash
mkdir -p browser-context/my-context
```

### List Available Contexts

```bash
browse-local contexts
```

Output:
```
Available contexts:
  - default
  - github-logged-in
  - work-account
```

### Delete a Context

```bash
rm -rf browser-context/my-context
```

---

## Pre-Login Workflow

The recommended workflow for creating a "logged-in" context:

### Step 1: Create the Context Directory

```bash
browse-local context create github-logged-in
```

### Step 2: Open Chrome with the Context

Launch Chrome using the context directory as its profile:

**macOS:**
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir=$(pwd)/browser-context/github-logged-in
```

**Linux:**
```bash
google-chrome --user-data-dir=./browser-context/github-logged-in
```

**Windows:**
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir=".\browser-context\github-logged-in"
```

### Step 3: Log In Manually

1. Chrome opens with a fresh profile
2. Navigate to the website
3. Log in with your credentials
4. Complete any 2FA or captcha challenges
5. Verify you're logged in (check profile, settings, etc.)

### Step 4: Close Chrome

Close Chrome completely. The session data is now saved in the context directory.

### Step 5: Verify

```bash
# List contexts
browse-local contexts

# The context should appear
# Now agents can use it!
```

---

## Using Contexts in MCP

### Start with Default Context

```json
{
  "name": "start",
  "arguments": {}
}
```

### Start with Named Context

```json
{
  "name": "start",
  "arguments": {
    "context": "github-logged-in"
  }
}
```

### Switch Contexts Mid-Session

```json
{
  "name": "use_context",
  "arguments": {
    "context": "work-account"
  }
}
```

### Specify Context for Individual Operations

```json
{
  "name": "navigate",
  "arguments": {
    "url": "https://github.com/settings/tokens",
    "context": "github-logged-in"
  }
}
```

---

## Context Patterns

### Pattern 1: Per-Site Contexts

Create separate contexts for different sites:

```
browser-context/
├── github-personal/
├── github-work/
├── gmail-personal/
└── gmail-work/
```

**Use case:** Multiple accounts on the same service.

### Pattern 2: Task-Based Contexts

Create contexts for different tasks:

```
browser-context/
├── research/          # For web research
├── shopping/          # Price comparisons
└── social-media/      # Social posting
```

**Use case:** Separate browsing contexts for different work modes.

### Pattern 3: Environment Contexts

Create contexts for different environments:

```
browser-context/
├── dev-local/         # Local development
├── staging/           # Staging server testing
└── production-readonly/
```

**Use case:** Testing against different environments without mixing cookies.

---

## Context Isolation

Each context is completely isolated:

- **Cookies are separate** - No shared sessions
- **Local storage is separate** - No data leakage
- **Cache is separate** - Fresh load each time

This isolation makes contexts ideal for:

- Multi-account management
- Security testing (no cookie contamination)
- Clean slate testing

---

## Best Practices

### 1. Create Contexts for Frequently Used Sites

Don't recreate login sessions repeatedly:

```bash
# Create once
browse-local context create gmail-work
# ... manually log in ...

# Use forever
# Agent can now access gmail-work without re-auth
```

### 2. Use Descriptive Names

```
# Good
github-work
stripe-dashboard
slack-teamname

# Bad
test
context1
temp
```

### 3. Backup Important Contexts

```bash
# Backup
cp -r browser-context/github-work browser-context/github-work.backup

# Restore
cp -r browser-context/github-work.backup browser-context/github-work
```

### 4. Clean Up Unused Contexts

```bash
# List
browse-local contexts

# Remove old ones
rm -rf browser-context/old-project
```

### 5. Handle Context Conflicts

If a site detects you're in a different browser profile:

1. Open Chrome manually with the context
2. Check for "suspicious login" emails
3. Verify the session is still valid
4. If expired, re-authenticate

---

## Strict Mode

By default, browser-base runs in **strict mode** - contexts must exist before use.

### Disable Strict Mode

```bash
# Environment variable
BROWSER_BASE_STRICT=0 browse-local start

# Or in Claude Desktop config
{
  "mcpServers": {
    "browser-base": {
      "env": {
        "BROWSER_BASE_STRICT": "0"
      }
    }
  }
}
```

### Strict Mode Behavior

| Action | Strict Mode | Non-Strict Mode |
|--------|-------------|-----------------|
| Start with non-existent context | Error | Creates context |
| Use non-existent context | Error | Creates context |
| Create context automatically | No | Yes |

### When to Disable Strict Mode

- Development/testing environments
- When agents should auto-create contexts
- When context directories are created externally

---

## Sharing Contexts

### Share Between Machines

Contexts can be copied to other machines:

```bash
# On machine A
tar -czf github-work.tar.gz browser-context/github-work/

# Transfer file to machine B
# On machine B
tar -xzf github-work.tar.gz -C browser-context/
```

### Caveats

- Some sites detect browser profile fingerprints
- IP address changes may trigger re-authentication
- Some cookies have machine-specific bindings

---

## Contexts vs Incognito

| Feature | Context | Incognito |
|---------|---------|-----------|
| Persistence | Yes (until deleted) | No (cleared on close) |
| Multiple instances | No (profile locked) | Yes (separate windows) |
| Bookmarks | Preserved | Not preserved |
| Downloads | Preserved | Preserved |
| Extensions | Preserved | Limited |

Contexts are for **persistent** needs; Incognito is for **temporary** isolation.

---

## Troubleshooting

### Context Locked

Chrome locks the profile directory while running:

```bash
# Error: "Profile already in use"
# Solution: Close all Chrome instances using this context

# Check for running Chrome
ps aux | grep Chrome
# Kill any Chrome processes
pkill -f Chrome
```

### Context Corrupted

If a context becomes corrupted:

```bash
# Delete the context
rm -rf browser-context/my-context

# Recreate (manually log in again)
browse-local context create my-context
# ... log in manually ...
```

### Context Not Found

```bash
# List available contexts
browse-local contexts

# Check the directory exists
ls -la browser-context/

# Create if missing
browse-local context create my-context
```

---

## Next Steps

- [Tools Reference](tools.md) - All 7 MCP tools
- [Installation Guide](install.md) - Set up for your agent
- [Examples](../examples/) - Runnable code examples