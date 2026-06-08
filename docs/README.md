# Documentation Index

Complete documentation for browser-base.

## Getting Started

| Document | Description |
|----------|-------------|
| [README.md](../README.md) | Project overview and quick start |
| [examples/basic-usage.ts](../examples/basic-usage.ts) | First example to run |

## Core Documentation

| Document | Description |
|----------|-------------|
| [tools.md](tools.md) | All 7 MCP tools with complete schemas and examples |
| [install.md](install.md) | Installation guide for Claude Desktop, Cursor, VS Code, Docker |
| [contexts.md](contexts.md) | Browser contexts and persistent login sessions |
| [architecture.md](architecture.md) | How the system components fit together |

## Examples

| File | Description |
|------|-------------|
| [examples/basic-usage.ts](../examples/basic-usage.ts) | Fundamental workflow: start, navigate, act, observe, extract |
| [examples/context-management.ts](../examples/context-management.ts) | Managing browser contexts |
| [examples/autonomous-agent.ts](../examples/autonomous-agent.ts) | How coding agents use browser-base |
| [examples/.env.example](../examples/.env.example) | Environment variable template |

---

## Quick Links

### Tools
- [start](tools.md#start) — Launch browser
- [end](tools.md#end) — Close session
- [use_context](tools.md#use_context) — Switch contexts
- [navigate](tools.md#navigate) — Go to URL
- [act](tools.md#act) — Click, type, interact
- [observe](tools.md#observe) — Find elements
- [extract](tools.md#extract) — Pull structured data

### Installation
- [Claude Desktop](install.md#claude-desktop-macos--linux)
- [Cursor](install.md#cursor)
- [VS Code](install.md#vs-code)
- [Docker](install.md#docker-usage)
- [Generic MCP](install.md#generic-mcp-hosts)

### Key Concepts
- [Browser Contexts](contexts.md#what-is-a-context)
- [Pre-Login Workflow](contexts.md#pre-login-workflow)
- [Context Patterns](contexts.md#context-patterns)
- [Environment Variables](install.md#environment-variables)

---

## Reading Order

1. **Start here:** [README.md](../README.md) — Quick start
2. **Learn the tools:** [tools.md](tools.md) — All 7 MCP tools
3. **Understand contexts:** [contexts.md](contexts.md) — Persistent sessions
4. **Install for your agent:** [install.md](install.md) — Setup instructions
5. **Deep dive:** [architecture.md](architecture.md) — System design

---

## Troubleshooting

### Chrome not found
```bash
# Specify path explicitly
browse-local start --browser-path /path/to/chrome
```

### Context not found
```bash
# List available contexts
browse-local contexts

# Create new context
browse-local context create my-context
```

### API key not set
```bash
export OPENAI_API_KEY=sk-your-key
# Or use Anthropic
export BROWSER_BASE_MODEL=anthropic/claude-sonnet-4-6
export ANTHROPIC_API_KEY=sk-ant-...
```

---

## Contributing

When adding new tools or features:
1. Update [tools.md](tools.md) with schema and examples
2. Add runnable example to [examples/](../examples/)
3. Update [architecture.md](architecture.md) if architecture changes
4. Update this index if adding new documentation files