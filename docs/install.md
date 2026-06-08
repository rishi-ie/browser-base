# Installation Guide

How to install and configure browser-base for different coding agents.

## Prerequisites

- Node.js 18+ (for npm/npx usage)
- Chrome or Chromium installed on your system
- API key for your LLM provider (OpenAI, Anthropic, etc.)

## Quick Install (All Agents)

The fastest way to get started is using npx:

```json
{
  "mcpServers": {
    "browser-base": {
      "command": "npx",
      "args": ["@browserbase/local-cli", "start", "--context-dir", "./browser-context"]
    }
  }
}
```

Set your API key in the environment:
```bash
export OPENAI_API_KEY=sk-...
# Or for Anthropic:
export BROWSER_BASE_MODEL=anthropic/claude-sonnet-4-6
```

---

## Claude Desktop (macOS / Linux)

### Option 1: Auto-install with CLI

```bash
npx @browserbase/local-cli install --agent claude-desktop
```

This automatically adds browser-base to your Claude Desktop configuration.

### Option 2: Manual Configuration

Find your Claude Desktop config file:

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

Add the MCP server entry:

```json
{
  "mcpServers": {
    "browser-base": {
      "command": "npx",
      "args": ["@browserbase/local-cli", "start", "--context-dir", "./browser-context"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key-here",
        "BROWSER_BASE_DEFAULT_CONTEXT": "default",
        "BROWSER_BASE_HEADFUL": "0"
      }
    }
  }
}
```

### Verify Installation

1. Restart Claude Desktop
2. Look for browser-base in the agent's available tools
3. Test with a simple task: "Open Google and tell me the title"

---

## Cursor

### Option 1: Auto-install with CLI

```bash
npx @browserbase/local-cli install --agent cursor
```

### Option 2: Manual Configuration

Open your Cursor MCP settings file:

```
~/.cursor/mcp.json
```

Add the browser-base entry:

```json
[
  {
    "mcpServer": {
      "command": "npx",
      "args": ["@browserbase/local-cli", "start", "--context-dir", "./browser-context"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key-here"
      }
    }
  }
]
```

If you already have other MCP servers configured, append this entry to the array.

### Verify Installation

1. Restart Cursor
2. Open Command Palette (Cmd/Ctrl + Shift + P)
3. Search for "MCP" and check that browser-base is listed

---

## VS Code

### Option 1: Auto-install with CLI

```bash
npx @browserbase/local-cli install --agent vscode
```

### Option 2: Manual Configuration

VS Code uses the MCP extension. Add to your settings:

```json
{
  "mcpServers": {
    "browser-base": {
      "command": "npx",
      "args": ["@browserbase/local-cli", "start", "--context-dir", "./browser-context"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key-here"
      }
    }
  }
}
```

### Install the MCP Extension

1. Open VS Code
2. Go to Extensions (Cmd/Ctrl + Shift + X)
3. Search for "Model Context Protocol"
4. Install the official MCP extension

---

## Generic MCP Hosts

For any MCP-compatible client, add this configuration:

```json
{
  "mcpServers": {
    "browser-base": {
      "command": "npx",
      "args": ["@browserbase/local-cli", "start", "--context-dir", "./browser-context"],
      "env": {
        "OPENAI_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Configuration File Locations

| Host | Config File |
|------|-------------|
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop (Linux) | `~/.config/Claude/claude_desktop_config.json` |
| Cursor | `~/.cursor/mcp.json` |
| VS Code | `.vscode/settings.json` or MCP extension settings |

---

## Docker Usage

### Pull the Image

```bash
docker pull browserbase/local:latest
```

### Run the Container

```bash
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=sk-your-key \
  -v $(pwd)/browser-context:/app/browser-context \
  browserbase/local:latest
```

### Use HTTP Transport

When using Docker, you'll likely want HTTP transport instead of stdio:

```bash
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=sk-your-key \
  -e BROWSER_BASE_PORT=3000 \
  -v $(pwd)/browser-context:/app/browser-context \
  browserbase/local:latest start --port 3000
```

Then connect your MCP client to `http://localhost:3000/mcp`.

---

## NPM Global Install

Install browser-base globally for CLI access:

```bash
npm install -g @browserbase/local-cli
```

Then use the `browse-local` command:

```bash
# Start the MCP server
browse-local start

# List available contexts
browse-local contexts

# Create a new context
browse-local context create github-logged-in

# Install into agents
browse-local install --agent claude-desktop
```

---

## Configuration Options

### Command Line Options

```bash
browse-local start \
  --context-dir ./browser-context \
  --default-context default \
  --headful \
  --model openai/gpt-4.1-mini \
  --verbose 1
```

| Option | Description | Default |
|--------|-------------|---------|
| `--context-dir <path>` | Directory for browser contexts | `./browser-context` |
| `--default-context <name>` | Default context to use | `default` |
| `--headful` | Show browser window | headless |
| `--model <model>` | LLM model for act/observe/extract | `openai/gpt-4.1-mini` |
| `--verbose <0|1|2>` | Logging verbosity | `1` |
| `--port <port>` | HTTP transport port | stdio (none) |
| `--browser-path <path>` | Path to Chrome binary | auto-detect |

### Environment Variables

```bash
# Browser configuration
BROWSER_BASE_CONTEXT_DIR=./browser-context
BROWSER_BASE_DEFAULT_CONTEXT=default
BROWSER_BASE_HEADFUL=0
BROWSER_BASE_BROWSER_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium

# LLM configuration
OPENAI_API_KEY=sk-...              # OpenAI API key
BROWSER_BASE_MODEL=openai/gpt-4.1-mini  # Model to use

# Transport configuration
BROWSER_BASE_PORT=3000             # HTTP port (omit for stdio)
BROWSER_BASE_HOST=localhost

# Logging
BROWSER_BASE_VERBOSE=1
```

---

## Troubleshooting

### Chrome Not Found

If browser-base can't find Chrome:

1. **macOS:** Chrome is usually at `/Applications/Google Chrome.app`
2. **Linux:** Try `google-chrome` or `chromium-browser`
3. **Windows:** Usually at `C:\Program Files\Google\Chrome\Application\chrome.exe`

Specify the path explicitly:

```bash
browse-local start --browser-path /path/to/chrome
```

### Context Not Found

In strict mode, contexts must exist before use:

```bash
# Create a context
browse-local context create github-logged-in

# Or disable strict mode
BROWSER_BASE_STRICT=0 browse-local start
```

### API Key Not Set

The `act`, `observe`, and `extract` tools require an LLM API key:

```bash
export OPENAI_API_KEY=sk-your-key
```

Or for Anthropic models:

```bash
export BROWSER_BASE_MODEL=anthropic/claude-sonnet-4-6
export ANTHROPIC_API_KEY=sk-ant-...
```

### Port Already in Use

If port 3000 is busy:

```bash
browse-local start --port 8080
```

### Docker Networking Issues

If connecting from host to Docker container:

```bash
docker run -p 127.0.0.1:3000:3000 ...
```

Only bind to localhost to avoid exposing the browser externally.

---

## Next Steps

- [Tools Reference](tools.md) - Learn all 7 MCP tools
- [Context Management](contexts.md) - Set up persistent login sessions
- [Examples](../examples/) - Runnable code examples