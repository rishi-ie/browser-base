# browser-base

Self-hosted browser infrastructure for AI coding agents.

Give your coding agent a local Chrome browser with persistent login sessions. No cloud dependency, no per-session billing.

## Quick Start

```bash
# Install
npm install -g @browserbase/local

# Or use npx
npx @browserbase/local start

# Configure your coding agent to use the MCP server:
# Add to your agent's MCP config:
# {
#   "mcpServers": {
#     "browser-base": {
#       "command": "npx",
#       "args": ["@browserbase/local", "start"]
#     }
#   }
# }
```

## Features

- **MCP Server** — 7 tools for browser control
- **Persistent Contexts** — login once, reuse forever
- **Stagehand Primitives** — act, observe, extract with LLM-powered element selection
- **Self-Install** — coding agents can install and configure themselves
- **Local Only** — no external dependencies, runs on your machine

## Tools

| Tool | Description |
|------|-------------|
| `start` | Launch browser (with optional context name) |
| `end` | Close browser session |
| `use_context` | Switch to a named context |
| `navigate` | Go to URL |
| `act` | Perform an action (click, type, etc.) |
| `observe` | Find actionable elements |
| `extract` | Pull structured data from page |

See [docs/tools.md](docs/tools.md) for full tool reference.
