# browser-base

Self-hosted browser infrastructure for AI coding agents.

Give your coding agent a local Chrome browser with persistent login sessions. No cloud dependency, no per-session billing.

## Features

- **MCP Server** — 7 tools for browser control via Model Context Protocol
- **Persistent Contexts** — login once, reuse forever (Chrome profile directories)
- **Stagehand Primitives** — act, observe, extract with LLM-powered element selection
- **Self-Install** — coding agents can install and configure themselves
- **Local Only** — no external dependencies, runs entirely on your machine

---

## Quick Start

### 1. Install

```bash
# Using npx (no install)
npx @browserbase/local-cli start

# Or install globally
npm install -g @browserbase/local-cli
browse-local start
```

### 2. Configure Your Agent

Add browser-base to your agent's MCP configuration:

**Claude Desktop:**
```json
{
  "mcpServers": {
    "browser-base": {
      "command": "npx",
      "args": ["@browserbase/local-cli", "start"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key-here"
      }
    }
  }
}
```

**Cursor:** Add to `~/.cursor/mcp.json`:
```json
[
  {
    "mcpServer": {
      "command": "npx",
      "args": ["@browserbase/local-cli", "start"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key-here"
      }
    }
  }
]
```

### 3. Set Your API Key

```bash
export OPENAI_API_KEY=sk-your-key-here
# Or use Anthropic:
export BROWSER_BASE_MODEL=anthropic/claude-sonnet-4-6
export ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Start Using

Your agent can now use browser automation tools. See [docs/tools.md](docs/tools.md) for all available tools.

---

## The 7 MCP Tools

| Tool | Description |
|------|-------------|
| `start` | Launch Chrome browser with a context |
| `end` | Close browser session |
| `use_context` | Switch to a different context |
| `navigate` | Go to a URL |
| `act` | Perform actions (click, type, etc.) |
| `observe` | Find interactive elements |
| `extract` | Pull structured data from page |

### Example Usage

**Start a session:**
```json
{ "name": "start", "arguments": {} }
```

**Navigate to a URL:**
```json
{ "name": "navigate", "arguments": { "url": "https://github.com" } }
```

**Click a button:**
```json
{ "name": "act", "arguments": { "action": "click the submit button" } }
```

**Extract data:**
```json
{ "name": "extract", "arguments": { "instruction": "get the page title and heading" } }
```

See [docs/tools.md](docs/tools.md) for complete tool reference.

---

## Browser Contexts

A **context** is a Chrome profile directory that stores cookies, login sessions, and local storage. Create a context once, log in manually, and reuse forever.

### Create a Context

```bash
browse-local context create github-work
```

### Pre-Login Workflow

1. Create the context:
   ```bash
   browse-local context create github-work
   ```

2. Open Chrome with that profile:
   ```bash
   # macOS
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
     --user-data-dir="$(pwd)/browser-context/github-work"
   
   # Linux
   google-chrome --user-data-dir=./browser-context/github-work
   ```

3. Log into the website manually

4. Close Chrome

5. Now agents can use the logged-in context:
   ```json
   { "name": "start", "arguments": { "context": "github-work" } }
   ```

See [docs/contexts.md](docs/contexts.md) for detailed context management.

---

## Installation for Different Agents

### Claude Desktop (macOS / Linux)

```bash
# Auto-install
npx @browserbase/local-cli install --agent claude-desktop

# Or manual: Edit
# ~/Library/Application Support/Claude/claude_desktop_config.json
```

### Cursor

```bash
# Auto-install
npx @browserbase/local-cli install --agent cursor

# Or manual: Edit ~/.cursor/mcp.json
```

### VS Code

Install the MCP extension, then add to settings:
```json
{
  "mcpServers": {
    "browser-base": {
      "command": "npx",
      "args": ["@browserbase/local-cli", "start"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key-here"
      }
    }
  }
}
```

### Generic MCP Hosts

```json
{
  "mcpServers": {
    "browser-base": {
      "command": "npx",
      "args": ["@browserbase/local-cli", "start"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key-here"
      }
    }
  }
}
```

See [docs/install.md](docs/install.md) for detailed installation instructions.

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | API key for LLM (required) | — |
| `BROWSER_BASE_MODEL` | LLM model to use | `openai/gpt-4.1-mini` |
| `BROWSER_BASE_CONTEXT_DIR` | Browser context directory | `./browser-context` |
| `BROWSER_BASE_DEFAULT_CONTEXT` | Default context name | `default` |
| `BROWSER_BASE_HEADFUL` | Show browser window | `0` (headless) |
| `BROWSER_BASE_PORT` | HTTP transport port (omit for stdio) | — |
| `BROWSER_BASE_VERBOSE` | Logging verbosity (0-2) | `1` |

See [examples/.env.example](examples/.env.example) for a complete template.

---

## Command Line Interface

```bash
# Start MCP server (default: stdio transport)
browse-local start

# Start with HTTP transport
browse-local start --port 3000

# Visible browser
browse-local start --headful

# List available contexts
browse-local contexts

# Create a new context
browse-local context create my-context

# Install into coding agents
browse-local install --agent claude-desktop
browse-local install --agent cursor
browse-local install --agent all
```

---

## Examples

See the [examples/](examples/) directory for runnable code:

- [basic-usage.ts](examples/basic-usage.ts) — Start session, navigate, act, observe, extract
- [context-management.ts](examples/context-management.ts) — List, create, switch contexts
- [autonomous-agent.ts](examples/autonomous-agent.ts) — Full agent workflow simulation

Run examples with:
```bash
npx tsx examples/basic-usage.ts
```

---

## Architecture

```
Agent (Claude/Cursor) --> MCP Server --> SessionManager --> Chrome (Stagehand)
                          |
                          +--> tools/ (start, end, navigate, act, observe, extract)
```

Key components:
- **`@browserbase/local`** — Core MCP server library
- **`@browserbase/local-cli`** — CLI entry point and agent installers

See [docs/architecture.md](docs/architecture.md) for detailed architecture documentation.

---

## Documentation

- [Tools Reference](docs/tools.md) — All 7 MCP tools with schemas and examples
- [Installation Guide](docs/install.md) — Setup for Claude Desktop, Cursor, VS Code, Docker
- [Context Management](docs/contexts.md) — Persistent login sessions, pre-login workflow
- [Architecture Overview](docs/architecture.md) — How the pieces fit together

---

## Requirements

- Node.js 18+
- Chrome or Chromium installed
- LLM API key (OpenAI, Anthropic, or compatible)

---

## License

MIT