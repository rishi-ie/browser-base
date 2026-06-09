"use strict";
/**
 * browser-base pi agent extension
 *
 * One-command install: pi install browserbase/browser-base
 *
 * This extension provides a unified `browser` tool for pi agents to control
 * a local Chrome with persistent login sessions.
 *
 * Features:
 * - Natural language browser automation (click, type, navigate)
 * - Persistent login sessions via Chrome profile directories
 * - Multiple contexts for different accounts/sites
 * - Full TypeScript type support
 *
 * Usage:
 * After installing, the agent can use:
 *   browser navigate to https://github.com
 *   browser click the sign in button
 *   browser observe find the search box
 *   browser extract get all product prices
 *
 * Configuration:
 *   BROWSER_BASE_HEADFUL=1        # show Chrome window
 *   BROWSER_BASE_CONTEXT_DIR      # default: ./browser-context
 *   BROWSER_BASE_DEFAULT_CONTEXT  # default: default
 *   BROWSER_BASE_BROWSER_PATH     # path to Chrome binary
 *
 * The extension uses the LLM already configured in pi. No separate API key needed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = browserBaseExtension;
const typebox_1 = require("typebox");
const local_1 = require("@browserbase/local");
/**
 * Singleton browser instance for the extension.
 * Lazily initialized on first use.
 */
let browserInstance = null;
let browserConfig = null;
function getBrowser() {
    if (!browserInstance) {
        if (!browserConfig) {
            browserConfig = (0, local_1.resolveConfig)({});
        }
        browserInstance = new local_1.Browser(browserConfig);
    }
    return browserInstance;
}
/**
 * Pi extension factory.
 *
 * Install: Add to ~/.pi/agent/extensions/browser-base.ts
 * Or: pi install @browserbase/local (when published to npm)
 */
async function browserBaseExtension(pi) {
    // Track if we started the browser (to avoid auto-ending if user had it running)
    let weStartedBrowser = false;
    // ─────────────────────────────────────────────────────────────
    // Register the main browser tool
    // ─────────────────────────────────────────────────────────────
    pi.registerTool({
        name: "browser",
        label: "Browser",
        description: "Control a local Chrome browser with persistent login sessions. Use for navigating websites, clicking buttons, filling forms, extracting data, and any browser automation. Sessions persist cookies and logins across runs.",
        promptSnippet: "browser navigate to <url> | browser click <element> | browser extract <data>",
        promptGuidelines: [
            "Use browser.navigate to open a URL before interacting with it",
            "Use browser.observe 'find <description>' to discover clickable elements",
            "Use browser.act '<instruction>' for natural language interactions like 'click the submit button'",
            "Use browser.extract '<instruction>' to get structured data like 'get all product names'",
            "Browser contexts store logins - use browser.start with context name for specific accounts",
        ],
        parameters: typebox_1.Type.Object({
            action: typebox_1.Type.Union([
                typebox_1.Type.Literal("navigate"),
                typebox_1.Type.Literal("act"),
                typebox_1.Type.Literal("observe"),
                typebox_1.Type.Literal("extract"),
                typebox_1.Type.Literal("start"),
                typebox_1.Type.Literal("end"),
                typebox_1.Type.Literal("use-context"),
                typebox_1.Type.Literal("status"),
                typebox_1.Type.Literal("contexts"),
            ], { description: "The browser action to perform" }),
            url: typebox_1.Type.Optional(typebox_1.Type.String({ description: "URL for navigate action" })),
            instruction: typebox_1.Type.Optional(typebox_1.Type.String({ description: "Instruction for act/observe/extract" })),
            schema: typebox_1.Type.Optional(typebox_1.Type.Any({ description: "JSON schema for extract action" })),
            context: typebox_1.Type.Optional(typebox_1.Type.String({ description: "Browser context name" })),
            name: typebox_1.Type.Optional(typebox_1.Type.String({ description: "Context name for use-context" })),
        }),
        async execute(toolCallId, params, signal, onUpdate, ctx) {
            const browser = getBrowser();
            try {
                switch (params.action) {
                    case "navigate": {
                        if (!params.url) {
                            return {
                                content: [{ type: "text", text: "Error: URL required for navigate action" }],
                                details: { error: "missing_url" },
                            };
                        }
                        if (params.context && !(0, local_1.contextExists)(browserConfig.contextDir, params.context)) {
                            return {
                                content: [{ type: "text", text: `Error: Context '${params.context}' not found. Available: ${(0, local_1.getAvailableContexts)(browserConfig.contextDir).join(", ") || "(none)"}` }],
                                details: { error: "context_not_found" },
                            };
                        }
                        if (params.context) {
                            await browser.useContext(params.context);
                        }
                        if (!browser.isActive()) {
                            await browser.start(params.context);
                            weStartedBrowser = true;
                        }
                        await browser.navigate(params.url);
                        return {
                            content: [{ type: "text", text: `Navigated to ${params.url}` }],
                            details: { url: params.url, context: browser.getCurrentContext() },
                        };
                    }
                    case "act": {
                        if (!params.instruction) {
                            return {
                                content: [{ type: "text", text: "Error: Instruction required for act action" }],
                                details: { error: "missing_instruction" },
                            };
                        }
                        if (params.context) {
                            await browser.useContext(params.context);
                        }
                        if (!browser.isActive()) {
                            await browser.start(params.context);
                            weStartedBrowser = true;
                        }
                        const result = await browser.act(params.instruction);
                        return {
                            content: [{ type: "text", text: result.message || result.actionDescription }],
                            details: {
                                success: result.success,
                                actionDescription: result.actionDescription,
                                actions: result.actions,
                                cacheStatus: result.cacheStatus,
                            },
                        };
                    }
                    case "observe": {
                        if (params.context) {
                            await browser.useContext(params.context);
                        }
                        if (!browser.isActive()) {
                            await browser.start(params.context);
                            weStartedBrowser = true;
                        }
                        const actions = await browser.observe(params.instruction);
                        const lines = actions.map((a, i) => `[${i + 1}] ${a.description}${a.method ? ` (${a.method})` : ""}\n    selector: ${a.selector}`);
                        return {
                            content: [{ type: "text", text: lines.join("\n") || "No elements found" }],
                            details: { count: actions.length, actions },
                        };
                    }
                    case "extract": {
                        if (!params.instruction) {
                            return {
                                content: [{ type: "text", text: "Error: Instruction required for extract action" }],
                                details: { error: "missing_instruction" },
                            };
                        }
                        if (params.context) {
                            await browser.useContext(params.context);
                        }
                        if (!browser.isActive()) {
                            await browser.start(params.context);
                            weStartedBrowser = true;
                        }
                        const data = await browser.extract(params.instruction, params.schema);
                        return {
                            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
                            details: { data, instruction: params.instruction },
                        };
                    }
                    case "start": {
                        const info = await browser.start(params.context);
                        weStartedBrowser = true;
                        return {
                            content: [{ type: "text", text: `Browser started with context: ${info.context}` }],
                            details: info,
                        };
                    }
                    case "end": {
                        await browser.end();
                        weStartedBrowser = false;
                        return {
                            content: [{ type: "text", text: "Browser session ended" }],
                            details: {},
                        };
                    }
                    case "use-context": {
                        if (!params.name) {
                            return {
                                content: [{ type: "text", text: "Error: Context name required for use-context" }],
                                details: { error: "missing_name" },
                            };
                        }
                        const info = await browser.useContext(params.name);
                        return {
                            content: [{ type: "text", text: `Switched to context: ${info.context}` }],
                            details: info,
                        };
                    }
                    case "status": {
                        return {
                            content: [{
                                    type: "text",
                                    text: JSON.stringify({
                                        active: browser.isActive(),
                                        currentContext: browser.getCurrentContext(),
                                        availableContexts: browser.getAvailableContexts(),
                                        debugUrl: browser.getDebugUrl(),
                                    }, null, 2),
                                }],
                            details: {
                                active: browser.isActive(),
                                currentContext: browser.getCurrentContext(),
                                availableContexts: browser.getAvailableContexts(),
                            },
                        };
                    }
                    case "contexts": {
                        return {
                            content: [{ type: "text", text: browser.getAvailableContexts().join("\n") || "(none)" }],
                            details: { contexts: browser.getAvailableContexts() },
                        };
                    }
                    default:
                        return {
                            content: [{ type: "text", text: `Unknown action: ${params.action}` }],
                            details: { error: "unknown_action" },
                        };
                }
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return {
                    content: [{ type: "text", text: `Error: ${message}` }],
                    details: { error: message },
                };
            }
        },
    });
    // ─────────────────────────────────────────────────────────────
    // Register commands for context management
    // ─────────────────────────────────────────────────────────────
    pi.registerCommand("browser-contexts", {
        description: "List available browser contexts",
        handler: async (_args, ctx) => {
            const browser = getBrowser();
            const contexts = browser.getAvailableContexts();
            if (contexts.length === 0) {
                ctx.ui.notify("No browser contexts found. Run: browse-local context create <name>", "info");
            }
            else {
                ctx.ui.notify(`Contexts: ${contexts.join(", ")}`, "info");
            }
        },
    });
    pi.registerCommand("browser-create-context", {
        description: "Create a new browser context (run CLI command)",
        handler: async (args, ctx) => {
            if (!args) {
                ctx.ui.notify("Usage: /browser-create-context <name>", "warning");
                return;
            }
            ctx.ui.notify(`Run: browse-local context create ${args}`, "info");
        },
    });
    // ─────────────────────────────────────────────────────────────
    // Lifecycle: auto-start on session, clean up on shutdown
    // ─────────────────────────────────────────────────────────────
    pi.on("session_start", async (_event, ctx) => {
        // Don't auto-start - let the agent decide when to use the browser
        // But show a hint if contexts exist
        const browser = getBrowser();
        const contexts = browser.getAvailableContexts();
        if (contexts.length > 0) {
            ctx.ui.setStatus("browser", `browser: ${contexts.length} context${contexts.length === 1 ? "" : "s"} available`);
        }
    });
    pi.on("session_shutdown", async (_event, _ctx) => {
        // Only end the browser if we started it
        if (weStartedBrowser && browserInstance) {
            try {
                await browserInstance.end();
            }
            catch {
                // Ignore errors on shutdown
            }
            weStartedBrowser = false;
        }
    });
    // ─────────────────────────────────────────────────────────────
    // Set session name hint
    // ─────────────────────────────────────────────────────────────
    if (typeof pi.setLabel === "function") {
        // Extension loaded successfully
    }
}
