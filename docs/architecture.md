# Architecture Overview

Understanding how browser-base fits together.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI Coding Agent                          │
│  (Claude Desktop, Cursor, VS Code, or any MCP client)            │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ MCP (JSON-RPC over stdio or HTTP)
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    browser-base MCP Server                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Session Manager                       │   │
│  │  - Manages Chrome lifecycle                              │   │
│  │  - Tracks active sessions per context                    │   │
│  │  - Provides session state to tools                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐    │
│  │   start    │ │    end     │ │ use_context│ │  navigate  │    │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘    │
│                                                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                   │
│  │    act     │ │  observe   │ │  extract   │                   │
│  └────────────┘ └────────────┘ └────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Chrome DevTools Protocol (CDP)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Chrome Browser Instance                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Stagehand (LOCAL mode)                │   │
│  │  - LLM-powered element selection                          │   │
│  │  - Action execution                                       │   │
│  │  - Data extraction                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 Chrome User Profile                       │   │
│  │  (Context directory with cookies, local storage, etc.)   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components

### MCP Server (`@browserbase/local`)

The core package that implements the MCP protocol. Located at `packages/core/`.

**Responsibilities:**
- Expose 7 tools via MCP protocol
- Manage session lifecycle
- Route requests to appropriate handlers
- Handle transport (stdio or HTTP)

**Key files:**
```
packages/core/src/
├── index.ts              # Main exports
├── config.ts             # Configuration resolution
├── sessionManager.ts     # Session lifecycle management
├── transport.ts          # Transport setup
└── tools/
    ├── index.ts          # Tool registry
    ├── tool.ts           # Tool definition helpers
    ├── start.ts          # Start session tool
    ├── end.ts            # End session tool
    ├── useContext.ts     # Switch context tool
    ├── navigate.ts       # Navigate tool
    ├── act.ts            # Act tool
    ├── observe.ts        # Observe tool
    └── extract.ts        # Extract tool
```

### CLI (`@browserbase/local-cli`)

Command-line interface and installation helpers. Located at `packages/cli/`.

**Commands:**
- `start` - Run the MCP server
- `install` - Install into coding agents
- `contexts` - List available contexts
- `context create` - Create a new context

**Key files:**
```
packages/cli/src/
├── program.ts            # CLI entry point
├── commands/
│   ├── start.ts          # Start command
│   ├── install.ts        # Install command
│   ├── contexts.ts      # List contexts command
│   └── contextCreate.ts # Create context command
└── install/
    ├── index.ts         # Install orchestrator
    ├── claudeDesktop.ts # Claude Desktop installer
    ├── cursor.ts        # Cursor installer
    └── vscode.ts        # VS Code installer
```

---

## Request Flow

### 1. Agent Sends Tool Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "start",
    "arguments": { "context": "github-logged-in" }
  }
}
```

### 2. MCP Server Receives Request

The transport layer receives the JSON-RPC message and routes it to the appropriate tool handler.

### 3. Tool Handler Executes

```typescript
// Simplified flow in start.ts
async (args) => {
  // 1. Validate context exists (in strict mode)
  const contexts = sessionManager.getAvailableContexts();
  if (!contexts.includes(contextName)) {
    return err(`Context does not exist`);
  }

  // 2. Create session (launch Chrome)
  await sessionManager.createSession(contextName);

  // 3. Return success
  return ok({ session: contextName, status: 'started' });
}
```

### 4. Session Manager Interacts with Chrome

```typescript
// In sessionManager.ts
async createSession(contextName: string) {
  // 1. Determine context directory
  const contextDir = path.join(config.browserContextDir, contextName);

  // 2. Launch Chrome with context as user data dir
  const chrome = await launch({
    headless: config.headless,
    chromePath: config.chromePath,
    userDataDir: contextDir,
  });

  // 3. Create Stagehand instance
  const stagehand = new Stagehand({
    env: 'LOCAL',
    chromeEndpoint: `http://localhost:${chrome.port}`,
  });

  // 4. Initialize and return session
  await stagehand.init();
  return { contextName, stagehand, chrome };
}
```

### 5. Response Returned to Agent

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"session\":\"github-logged-in\",\"status\":\"started\"}"
      }
    ]
  }
}
```

---

## Directory Layout

```
browser-base/
├── docs/                     # This documentation
│   ├── tools.md             # MCP tool reference
│   ├── install.md           # Installation guide
│   ├── contexts.md          # Context management guide
│   └── architecture.md      # This file
│
├── examples/                 # Runnable examples
│   ├── basic-usage.ts       # Basic browser automation
│   ├── context-management.ts # Context operations
│   ├── autonomous-agent.ts  # Full agent workflow
│   └── .env.example         # Environment template
│
├── packages/
│   ├── core/                 # @browserbase/local
│   │   ├── src/
│   │   │   ├── index.ts     # Main exports
│   │   │   ├── config.ts    # Configuration
│   │   │   ├── sessionManager.ts
│   │   │   ├── transport.ts
│   │   │   └── tools/       # MCP tool implementations
│   │   └── package.json
│   │
│   └── cli/                  # @browserbase/local-cli
│       ├── src/
│       │   ├── program.ts   # CLI entry point
│       │   ├── commands/   # CLI commands
│       │   └── install/     # Agent installers
│       └── package.json
│
├── browser-context/          # Chrome profiles (created at runtime)
│   ├── default/
│   └── github-logged-in/
│
└── node_modules/             # Dependencies
```

---

## Data Flow: Act Tool Example

Here's how a typical `act` call flows through the system:

```
Agent                          MCP Server                      Chrome
  │                                │                              │
  │  act({action:"click login"})   │                              │
  │───────────────────────────────>│                              │
  │                                │                              │
  │                                │  stagehand.act({action})     │
  │                                │─────────────────────────────>│
  │                                │                              │
  │                                │  <-- CDP: Input.dispatchMouseClick
  │                                │<─────────────────────────────│
  │                                │                              │
  │  {success: true}               │                              │
  │<───────────────────────────────│                              │
  │                                │                              │
```

### Step-by-Step:

1. **Agent** sends `act` request with natural language instruction
2. **MCP Server** receives JSON-RPC, routes to `act` tool handler
3. **Act Tool** calls `sessionManager.act(contextName, instruction)`
4. **SessionManager** calls `stagehand.act({ action })`
5. **Stagehand** uses LLM to find element, sends CDP command to Chrome
6. **Chrome** executes the click, returns result via CDP
7. **Stagehand** parses result, returns to SessionManager
8. **SessionManager** wraps result, returns to tool handler
9. **Tool Handler** formats as MCP response
10. **MCP Server** sends JSON-RPC response to agent

---

## Configuration Resolution

Configuration is resolved in this order (first wins):

1. **CLI arguments** (`--context-dir`, `--port`, etc.)
2. **Environment variables** (`BROWSER_BASE_CONTEXT_DIR`, etc.)
3. **Config file** (`.env` or `browse-local.config.js`)
4. **Defaults** (built into the CLI)

### Config Precedence

```typescript
// In config.ts
headless: options.headless ??
         process.env.BROWSER_BASE_HEADFUL === '1' ? false :
         DEFAULT_CONFIG.headless
```

---

## Transport Modes

### Stdio (Default)

Communication via stdin/stdout. Ideal for local MCP clients.

```
Agent <--stdio--> MCP Server
```

**Pros:** Simple, no network needed, secure
**Cons:** Only local access

### HTTP (Optional)

Communication via HTTP server. Enables remote access.

```
Agent <--HTTP--> MCP Server
```

**Pros:** Remote access, can run in Docker
**Cons:** Needs network, more complex setup

---

## Session Management

### Session Lifecycle

```
createSession() ──> [Session exists] ──> closeSession()
                      │
                      ├─> navigate()
                      ├─> act()
                      ├─> observe()
                      └─> extract()
```

### Session State

```typescript
interface Session {
  id: string;           // Context name
  contextName: string;  // Same as id
  contextDir: string;   // Path to Chrome profile
  stagehand: Stagehand; // Browser automation instance
  chrome: ChromeInstance; // Chrome process
}
```

### Multiple Sessions

The SessionManager can handle multiple sessions simultaneously:

```typescript
// Two contexts running at once
const session1 = await sessionManager.createSession('github');
const session2 = await sessionManager.createSession('gmail');

// Switch between them
await sessionManager.navigate('github', 'https://github.com');
await sessionManager.navigate('gmail', 'https://gmail.com');
```

---

## Security Considerations

### Local-Only Operation

- All data stays on your machine
- No external servers or cloud services
- Chrome runs locally under your user account

### Context Isolation

- Each context is a separate Chrome profile
- No cross-context data leakage
- Cookies, local storage are isolated

### API Keys

- Store API keys in environment variables
- Never commit keys to version control
- Use `.env.example` template (no real keys)

---

## Extension Points

### Adding a New Tool

1. Create `packages/core/src/tools/myTool.ts`:

```typescript
import { z } from 'zod';
import { defineTool, ok, err } from './tool.js';
import { SessionManager } from '../sessionManager.js';

const MyToolSchema = z.object({
  // Define input schema
});

export function createMyToolTool(sessionManager: SessionManager) {
  return defineTool(
    'my_tool',
    'Description of what the tool does',
    MyToolSchema,
    async (args) => {
      // Implementation
      return ok({ result: 'success' });
    }
  );
}
```

2. Export from `packages/core/src/tools/index.ts`:

```typescript
export { createMyToolTool } from './myTool.js';
```

3. Register in the MCP server creation.

### Adding a New Transport

1. Implement the transport interface
2. Update `packages/core/src/transport.ts`
3. Handle the transport in CLI startup

---

## Next Steps

- [Tools Reference](tools.md) - All 7 MCP tools in detail
- [Installation Guide](install.md) - Set up for your agent
- [Context Management](contexts.md) - Using browser contexts
- [Examples](../examples/) - Runnable code examples