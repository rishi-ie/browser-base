# MCP Tools Reference

Complete reference for all 7 MCP tools provided by browser-base.

## Overview

Browser-base exposes 7 tools via the MCP (Model Context Protocol) server. Each tool controls a specific aspect of browser automation using Stagehand under the hood.

## Tool Summary

| Tool | Purpose |
|------|---------|
| `start` | Launch Chrome browser with a context |
| `end` | Close browser session |
| `use_context` | Switch to a different context |
| `navigate` | Go to a URL |
| `act` | Perform actions (click, type, etc.) |
| `observe` | Find interactive elements |
| `extract` | Pull structured data from page |

---

## start

Launch a Chrome browser session with the specified context.

### Description

Creates a new browser session using the Chrome profile directory for the given context. If the session already exists and is running, returns `already_running` status.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "context": {
      "type": "string",
      "description": "Context name (default: \"default\")"
    }
  }
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `context` | string | No | Name of the browser context. Defaults to `"default"`. |

### Output

```json
{
  "session": "string",
  "status": "started" | "already_running"
}
```

### Examples

**Start default session:**
```json
{
  "name": "start",
  "arguments": {}
}
```

**Start with custom context:**
```json
{
  "name": "start",
  "arguments": {
    "context": "github-logged-in"
  }
}
```

### Notes

- In strict mode (default), the context must already exist on disk
- The browser launches in headless mode by default
- Set `BROWSER_BASE_HEADFUL=1` to see the browser window

---

## end

Close an active browser session.

### Description

Closes the Chrome browser for the specified context. Idempotent - returns `not_running` if no session exists.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "context": {
      "type": "string",
      "description": "Context name (default: \"default\")"
    }
  }
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `context` | string | No | Name of the browser context. Defaults to `"default"`. |

### Output

```json
{
  "session": "string",
  "status": "closed" | "not_running"
}
```

### Examples

**End default session:**
```json
{
  "name": "end",
  "arguments": {}
}
```

**End specific context:**
```json
{
  "name": "end",
  "arguments": {
    "context": "github-logged-in"
  }
}
```

---

## use_context

Switch to a different browser context.

### Description

Ends any current session and starts a new one with the specified context. The new context must already exist on disk.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "context": {
      "type": "string",
      "description": "Context name to switch to"
    }
  },
  "required": ["context"]
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `context` | string | Yes | Name of the context to switch to. Must exist on disk. |

### Output

```json
{
  "context": "string",
  "status": "switched"
}
```

### Examples

**Switch to a logged-in context:**
```json
{
  "name": "use_context",
  "arguments": {
    "context": "github-logged-in"
  }
}
```

### Error Cases

- Context does not exist: Returns error with list of available contexts
- Context switch fails: Returns error with details

---

## navigate

Navigate to a URL in the browser.

### Description

Opens a URL in the active browser session. Requires an active session (use `start` first).

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "description": "URL to navigate to"
    },
    "context": {
      "type": "string",
      "description": "Context name (default: \"default\")"
    }
  },
  "required": ["url"]
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Full URL including protocol (e.g., `https://github.com`) |
| `context` | string | No | Browser context. Defaults to `"default"`. |

### Output

```json
{
  "url": "string",
  "status": "navigated"
}
```

### Examples

**Navigate to a website:**
```json
{
  "name": "navigate",
  "arguments": {
    "url": "https://github.com"
  }
}
```

**Navigate in specific context:**
```json
{
  "name": "navigate",
  "arguments": {
    "url": "https://github.com/settings/tokens",
    "context": "github-logged-in"
  }
}
```

### Error Cases

- No session running: Returns error indicating `start` must be called first
- Navigation fails: Returns error with details

---

## act

Perform an action in the browser (click, type, hover, etc.).

### Description

Uses LLM-powered element selection to perform actions described in natural language. The agent analyzes the page and finds the best matching element.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "description": "Action to perform (e.g., \"click the submit button\")"
    },
    "context": {
      "type": "string",
      "description": "Context name (default: \"default\")"
    }
  },
  "required": ["action"]
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | Natural language description of the action to perform. |
| `context` | string | No | Browser context. Defaults to `"default"`. |

### Output

```json
{
  "success": true
}
```

### Examples

**Click a button:**
```json
{
  "name": "act",
  "arguments": {
    "action": "click the submit button"
  }
}
```

**Type into a field:**
```json
{
  "name": "act",
  "arguments": {
    "action": "type 'hello world' into the search field"
  }
}
```

**Select from dropdown:**
```json
{
  "name": "act",
  "arguments": {
    "action": "select 'Option 2' from the country dropdown"
  }
}
```

**Check a checkbox:**
```json
{
  "name": "act",
  "arguments": {
    "action": "check the 'Remember me' checkbox"
  }
}
```

### Action Types

The `act` tool understands various action patterns:

| Action Pattern | Example |
|----------------|---------|
| Click | `"click the login button"` |
| Type | `"type 'my email' in the email field"` |
| Select | `"select 'Python' from the language dropdown"` |
| Check/Uncheck | `"check the agree checkbox"` |
| Hover | `"hover over the user menu"` |
| Press | `"press Enter"` |

### Error Cases

- No session running: Returns error
- Element not found: Returns error with suggestion to use `observe` first
- Action fails: Returns error with details

---

## observe

Observe and identify elements on the current page.

### Description

Uses LLM-powered element detection to find interactive elements matching a description. Returns all matching elements with their properties.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "instruction": {
      "type": "string",
      "description": "What to look for on the page"
    },
    "context": {
      "type": "string",
      "description": "Context name (default: \"default\")"
    }
  },
  "required": ["instruction"]
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instruction` | string | Yes | Natural language description of elements to find. |
| `context` | string | No | Browser context. Defaults to `"default"`. |

### Output

```json
{
  "elements": [
    {
      "role": "string",
      "name": "string",
      "description": "string"
    }
  ]
}
```

### Examples

**Find all buttons:**
```json
{
  "name": "observe",
  "arguments": {
    "instruction": "find all buttons on the page"
  }
}
```

**Find form inputs:**
```json
{
  "name": "observe",
  "arguments": {
    "instruction": "find the login form fields"
  }
}
```

**Find links:**
```json
{
  "name": "observe",
  "arguments": {
    "instruction": "find navigation links"
  }
}
```

**Find modal dialogs:**
```json
{
  "name": "observe",
  "arguments": {
    "instruction": "find any dialog or modal"
  }
}
```

### Use Cases

- Exploring unknown pages before acting
- Verifying expected elements exist
- Debugging element selection issues

---

## extract

Extract structured data from the current page.

### Description

Uses LLM-powered extraction to pull structured data from the page. Can optionally validate against a Zod schema.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "instruction": {
      "type": "string",
      "description": "What data to extract from the page"
    },
    "schema": {
      "type": "object",
      "description": "Zod schema for the extracted data (optional)"
    },
    "context": {
      "type": "string",
      "description": "Context name (default: \"default\")"
    }
  },
  "required": ["instruction"]
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `instruction` | string | Yes | Natural language description of data to extract. |
| `schema` | object | No | Zod schema to validate extracted data against. |
| `context` | string | No | Browser context. Defaults to `"default"`. |

### Output

```json
{
  "data": {}
}
```

### Examples

**Extract page title:**
```json
{
  "name": "extract",
  "arguments": {
    "instruction": "get the page title and heading"
  }
}
```

**Extract product info:**
```json
{
  "name": "extract",
  "arguments": {
    "instruction": "extract the product name, price, and description"
  }
}
```

**Extract with schema:**
```json
{
  "name": "extract",
  "arguments": {
    "instruction": "extract user profile data",
    "schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string" },
        "avatar": { "type": "string" }
      },
      "required": ["name", "email"]
    }
  }
}
```

**Extract table data:**
```json
{
  "name": "extract",
  "arguments": {
    "instruction": "extract all rows from the data table with columns: name, email, role"
  }
}
```

### Use Cases

- Scraping structured data from web pages
- Reading form values
- Extracting data from tables
- Pulling user profile information

---

## Error Handling

All tools return errors in a consistent format:

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Error message describing what went wrong"
    }
  ]
}
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `No session running` | Browser not started | Call `start` first |
| `Context does not exist` | Context not found | Create context with CLI or manually |
| `Action failed` | Element not found or action error | Use `observe` to see elements, then retry |
| `Navigation failed` | Invalid URL or network error | Check URL and try again |

---

## Environment Variables

Tools respect the following environment variables:

| Variable | Effect |
|----------|--------|
| `BROWSER_BASE_HEADFUL=1` | Show browser window instead of headless |
| `BROWSER_BASE_CONTEXT_DIR` | Custom browser context directory |
| `BROWSER_BASE_DEFAULT_CONTEXT` | Default context name |
| `BROWSER_BASE_MODEL` | LLM model for act/observe/extract |
| `OPENAI_API_KEY` | API key for OpenAI (or set `BROWSER_BASE_MODEL`) |