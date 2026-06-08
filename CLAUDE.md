# CLAUDE.md — Working on browser-base

## Project Overview

browser-base is a self-hosted browser infrastructure for AI coding agents. It provides an MCP server that gives agents full browser control with persistent login sessions, running entirely locally on the same machine.

## Architecture

```
packages/
├── core/    — @browserbase/local — the MCP server library
└── cli/     — CLI entrypoint + install command
```

### Core Packages

**@browserbase/local** (packages/core)
- MCP server factory (`createServer`)
- SessionManager for Chrome lifecycle
- 7 MCP tools: start, end, use_context, navigate, act, observe, extract
- Transport: stdio (primary) + localhost HTTP (fallback)
- Uses Stagehand under the hood (`env: "LOCAL"`)

**CLI** (packages/cli)
- `browse-local start` — run MCP server
- `browse-local install` — self-install into coding agents

### Directory Structure

- `browser-context/` — Chrome profile directories (managed by server)
- `packages/core/src/` — TypeScript source
- `packages/core/src/tools/` — MCP tool implementations

### Key Dependencies

- `@browserbasehq/stagehand` — browser automation engine
- `@modelcontextprotocol/sdk` — MCP server SDK
- `chrome-launcher` — local Chrome launch
- `commander` — CLI parsing

### Adding a New Tool

1. Create `packages/core/src/tools/<name>.ts`
2. Define schema and handler
3. Register in `packages/core/src/tools/index.ts`

### Testing

```bash
pnpm install
pnpm build
cd packages/core && pnpm test
```

## Design Decisions

- **Stagehand LOCAL mode** — raw CDP, no Playwright dep for core
- **Context = Chrome profile dir** — zero custom storage format
- **Strict context access** — contexts must pre-exist on disk
- **Headless by default** — `HEADFUL=1` env var for visible Chrome
