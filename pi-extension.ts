/**
 * browser-base pi agent extension
 * 
 * Simple browser control plugin for coding agents.
 * 
 * Flow:
 * 1. User asks to do something on Twitter/Instagram
 * 2. Plugin opens Chrome (visible), auto-creates context from URL domain
 * 3. If not logged in, user signs in manually in the visible browser
 * 4. Context is saved automatically
 * 5. Next time, no re-signing needed
 * 
 * Install: Copy to ~/.pi/agent/extensions/browser-base.ts
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { 
  Browser, 
  resolveConfig, 
  contextExists, 
  createContext,
  extractDomainFromUrl,
  checkLoginStatus,
} from "./packages/core/dist/index.js";

/**
 * Singleton browser instance.
 */
let browserInstance: Browser | null = null;
let browserConfig: ReturnType<typeof resolveConfig> | null = null;
let weStartedBrowser = false;

function getBrowser(): Browser {
  if (!browserInstance) {
    if (!browserConfig) {
      // Default to headful=true so user can see browser and sign in
      browserConfig = resolveConfig({ headful: true });
    }
    browserInstance = new Browser(browserConfig);
  }
  return browserInstance;
}

/**
 * Format element info for display to the agent.
 */
function formatElements(elements: { selector: string; role: string; name: string; text: string; clickable: boolean; editable: boolean; isVisible: boolean }[]): string {
  if (elements.length === 0) {
    return "No interactive elements found on page.";
  }

  const lines = elements.map((el, i) => {
    const attrs: string[] = [];
    if (el.clickable) attrs.push("clickable");
    if (el.editable) attrs.push("editable");
    if (el.isVisible) attrs.push("visible");
    
    const attrStr = attrs.length > 0 ? ` [${attrs.join(", ")}]` : "";
    const text = el.text ? ` "${el.text.slice(0, 50)}${el.text.length > 50 ? "..." : ""}"` : "";
    
    return `[${i + 1}] ${el.role}${el.name ? ` (${el.name})` : ""}${text}${attrStr}\n    ${el.selector}`;
  });

  return `Found ${elements.length} interactive elements:\n\n${lines.join("\n\n")}`;
}

export default async function browserBaseExtension(pi: ExtensionAPI): Promise<void> {
  pi.registerTool({
    name: "browser",
    label: "Browser",
    description: "Control a local Chrome browser. Use for navigating websites, clicking buttons, filling forms, extracting data. Browser is visible by default so user can sign in when needed. Contexts are auto-created from URL domain.",
    promptSnippet: "browser navigate <url> | browser click <selector> | browser observe | browser status",
    promptGuidelines: [
      "browser.navigate(url) opens Chrome and auto-creates context from domain (e.g., twitter.com -> 'twitter' context)",
      "If user needs to sign in, Chrome is visible - user can sign in manually, then tell agent when done",
      "browser.observe() shows all clickable/editable elements on the page",
      "browser.click(selector) clicks an element - use selector like #id, .class, or [attr]",
      "browser.type(selector, text) types into an input field",
      "browser.extract(selector) gets text from an element",
      "All operations are deterministic - no LLM guessing",
    ],

    parameters: Type.Object({
      action: Type.Union([
        Type.Literal("navigate"),
        Type.Literal("click"),
        Type.Literal("type"),
        Type.Literal("press"),
        Type.Literal("hover"),
        Type.Literal("select"),
        Type.Literal("scroll"),
        Type.Literal("observe"),
        Type.Literal("getElement"),
        Type.Literal("extract"),
        Type.Literal("evaluate"),
        Type.Literal("getUrl"),
        Type.Literal("getTitle"),
        Type.Literal("screenshot"),
        Type.Literal("has"),
        Type.Literal("waitFor"),
        Type.Literal("reload"),
        Type.Literal("back"),
        Type.Literal("forward"),
        Type.Literal("status"),
        Type.Literal("end"),
      ]),

      // Common
      context: Type.Optional(Type.String()),
      timeout: Type.Optional(Type.Number()),
      
      // Navigation
      url: Type.Optional(Type.String()),
      waitUntil: Type.Optional(Type.Union([
        Type.Literal("load"),
        Type.Literal("domcontentloaded"),
        Type.Literal("networkidle"),
        Type.Literal("commit"),
      ])),
      
      // Interactions
      selector: Type.Optional(Type.String()),
      text: Type.Optional(Type.String()),
      key: Type.Optional(Type.String()),
      direction: Type.Optional(Type.Union([
        Type.Literal("up"),
        Type.Literal("down"),
        Type.Literal("left"),
        Type.Literal("right"),
      ])),
      values: Type.Optional(Type.Union(Type.String(), Type.Array(Type.String()))),
      attribute: Type.Optional(Type.String()),
      fullPage: Type.Optional(Type.Boolean()),
      clickCount: Type.Optional(Type.Number()),
      button: Type.Optional(Type.Union([Type.Literal("left"), Type.Literal("right"), Type.Literal("middle")])),
      delay: Type.Optional(Type.Number()),
      clear: Type.Optional(Type.Boolean()),
      force: Type.Optional(Type.Boolean()),
      many: Type.Optional(Type.Boolean()),
      state: Type.Optional(Type.Union([
        Type.Literal("visible"),
        Type.Literal("hidden"),
        Type.Literal("attached"),
        Type.Literal("detached"),
      ])),
      amount: Type.Optional(Type.Number()),
      script: Type.Optional(Type.String()),
      path: Type.Optional(Type.String()),
    }),

    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const browser = getBrowser();

      try {
        // Navigate - auto-create context from domain
        if (params.action === "navigate") {
          if (!params.url) {
            return {
              content: [{ type: "text", text: "Error: URL required. Usage: browser navigate https://twitter.com" }],
              details: { error: "missing_url" },
            };
          }
          
          // Auto-determine context from URL
          const contextName = extractDomainFromUrl(params.url);
          
          // Auto-create context if needed
          if (!contextExists(browserConfig!.contextDir, contextName)) {
            createContext(browserConfig!.contextDir, contextName);
          }
          
          // Start browser if not active
          if (!browser.isBrowserActive()) {
            await browser.start(contextName);
            weStartedBrowser = true;
          } else if (contextName !== browser.getCurrentContext()) {
            await browser.useContext(contextName);
          }

          await browser.navigate(params.url, {
            timeout: params.timeout,
            waitUntil: params.waitUntil,
          });

          // Check login status
          const page = browser.getPage();
          let needsLogin = false;
          let loginMessage = "";
          
          if (page) {
            const loginStatus = await checkLoginStatus(page);
            needsLogin = !loginStatus.loggedIn;
            loginMessage = loginStatus.message;
          }

          const status = await browser.getStatus();
          
          let message = `Navigated to ${params.url}`;
          if (needsLogin) {
            message += `\n\n⚠️ Login required: ${loginMessage}. Chrome is visible - please sign in manually, then tell me when done.`;
          }

          return {
            content: [{ type: "text", text: message }],
            details: { 
              url: params.url, 
              context: contextName,
              needsLogin,
              loginMessage,
              ...status 
            },
          };
        }

        // Require active session for most actions
        if (!browser.isBrowserActive()) {
          return {
            content: [{ type: "text", text: "Error: No browser session active. Call browser.navigate first." }],
            details: { error: "no_session" },
          };
        }

        // Click
        if (params.action === "click") {
          if (!params.selector) {
            return { content: [{ type: "text", text: "Error: Selector required. Usage: browser click #button" }], details: { error: "missing_selector" } };
          }
          const result = await browser.click(params.selector!, {
            button: params.button,
            clickCount: params.clickCount,
            timeout: params.timeout,
            force: params.force,
          });
          if (!result.success) {
            return { content: [{ type: "text", text: `Click failed: ${result.error}` }], details: result };
          }
          return { content: [{ type: "text", text: `Clicked ${params.selector}` }], details: result };
        }

        // Type
        if (params.action === "type") {
          if (!params.selector) {
            return { content: [{ type: "text", text: "Error: Selector required. Usage: browser type #input Hello" }], details: { error: "missing_selector" } };
          }
          if (!params.text) {
            return { content: [{ type: "text", text: "Error: Text required. Usage: browser type #input Hello" }], details: { error: "missing_text" } };
          }
          const result = await browser.type(params.selector!, params.text, {
            delay: params.delay,
            timeout: params.timeout,
            clear: params.clear,
            force: params.force,
          });
          if (!result.success) {
            return { content: [{ type: "text", text: `Type failed: ${result.error}` }], details: result };
          }
          return { content: [{ type: "text", text: `Typed "${params.text}" into ${params.selector}` }], details: result };
        }

        // Press
        if (params.action === "press") {
          if (!params.key) {
            return { content: [{ type: "text", text: "Error: Key required. Usage: browser press Enter" }], details: { error: "missing_key" } };
          }
          const result = await browser.press(params.selector, params.key, { timeout: params.timeout });
          if (!result.success) {
            return { content: [{ type: "text", text: `Press failed: ${result.error}` }], details: result };
          }
          return { content: [{ type: "text", text: `Pressed ${params.key}` }], details: result };
        }

        // Hover
        if (params.action === "hover") {
          if (!params.selector) {
            return { content: [{ type: "text", text: "Error: Selector required. Usage: browser hover #menu" }], details: { error: "missing_selector" } };
          }
          const result = await browser.hover(params.selector!, { timeout: params.timeout });
          if (!result.success) {
            return { content: [{ type: "text", text: `Hover failed: ${result.error}` }], details: result };
          }
          return { content: [{ type: "text", text: `Hovered ${params.selector}` }], details: result };
        }

        // Select
        if (params.action === "select") {
          if (!params.selector) {
            return { content: [{ type: "text", text: "Error: Selector required. Usage: browser select select[name='color'] red" }], details: { error: "missing_selector" } };
          }
          if (!params.values) {
            return { content: [{ type: "text", text: "Error: Values required. Usage: browser select select red" }], details: { error: "missing_values" } };
          }
          const result = await browser.select(params.selector!, 
            Array.isArray(params.values) ? params.values : [params.values],
            { timeout: params.timeout }
          );
          if (!result.success) {
            return { content: [{ type: "text", text: `Select failed: ${result.error}` }], details: result };
          }
          return { content: [{ type: "text", text: `Selected ${result.selected.join(", ")} in ${params.selector}` }], details: result };
        }

        // Scroll
        if (params.action === "scroll") {
          const result = await browser.scroll(params.selector, params.direction ?? "down", params.amount ?? 3);
          if (!result.success) {
            return { content: [{ type: "text", text: `Scroll failed: ${result.error}` }], details: result };
          }
          return { content: [{ type: "text", text: `Scrolled ${params.direction ?? "down"}` }], details: result };
        }

        // Wait
        if (params.action === "waitFor") {
          if (!params.selector) {
            return { content: [{ type: "text", text: "Error: Selector required. Usage: browser waitFor #loading" }], details: { error: "missing_selector" } };
          }
          const result = await browser.waitFor(params.selector!, {
            timeout: params.timeout,
            state: params.state,
          });
          if (!result.success) {
            return { content: [{ type: "text", text: `Wait failed: ${result.error}` }], details: result };
          }
          return { content: [{ type: "text", text: `Element ${params.selector} is ${params.state ?? "visible"}` }], details: result };
        }

        // Observe - get all elements on page
        if (params.action === "observe") {
          const elements = await browser.observe(params.text);
          return {
            content: [{ type: "text", text: formatElements(elements) }],
            details: { count: elements.length, elements },
          };
        }

        // Get element info
        if (params.action === "getElement") {
          if (!params.selector) {
            return { content: [{ type: "text", text: "Error: Selector required. Usage: browser getElement #id" }], details: { error: "missing_selector" } };
          }
          const info = await browser.getElementInfo(params.selector);
          if (!info) {
            return { content: [{ type: "text", text: `Element not found: ${params.selector}` }], details: { error: "not_found" } };
          }
          return {
            content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
            details: { element: info },
          };
        }

        // Extract
        if (params.action === "extract") {
          if (!params.selector) {
            return { content: [{ type: "text", text: "Error: Selector required. Usage: browser extract .price" }], details: { error: "missing_selector" } };
          }
          const result = await browser.extract(params.selector, {
            many: params.many,
            attribute: params.attribute,
          });
          if (!result.success) {
            return { content: [{ type: "text", text: `Extract failed: ${result.error}` }], details: result };
          }
          const text = result.text ?? (result.texts ? result.texts.join("\n") : null) ?? result.attribute ?? "";
          return { content: [{ type: "text", text }], details: result };
        }

        // Evaluate
        if (params.action === "evaluate") {
          if (!params.script) {
            return { content: [{ type: "text", text: "Error: Script required. Usage: browser evaluate document.title" }], details: { error: "missing_script" } };
          }
          const result = await browser.evaluate(params.script);
          if (!result.success) {
            return { content: [{ type: "text", text: `Evaluate failed: ${result.error}` }], details: result };
          }
          return { content: [{ type: "text", text: JSON.stringify(result.result, null, 2) }], details: { result: result.result } };
        }

        // Get URL
        if (params.action === "getUrl") {
          const url = await browser.getUrl();
          return { content: [{ type: "text", text: url ?? "(no page)" }], details: { url } };
        }

        // Get Title
        if (params.action === "getTitle") {
          const title = await browser.getTitle();
          return { content: [{ type: "text", text: title ?? "(no page)" }], details: { title } };
        }

        // Screenshot
        if (params.action === "screenshot") {
          const result = await browser.screenshot({ path: params.path, fullPage: params.fullPage });
          if (!result.success) {
            return { content: [{ type: "text", text: `Screenshot failed: ${result.error}` }], details: { error: result.error } };
          }
          return { content: [{ type: "text", text: `Screenshot saved to ${result.path}` }], details: result };
        }

        // Has
        if (params.action === "has") {
          if (!params.selector) {
            return { content: [{ type: "text", text: "Error: Selector required" }], details: { error: "missing_selector" } };
          }
          const exists = await browser.has(params.selector);
          return { content: [{ type: "text", text: exists ? "yes" : "no" }], details: { exists } };
        }

        // Reload
        if (params.action === "reload") {
          await browser.reload({ timeout: params.timeout });
          return { content: [{ type: "text", text: "Page reloaded" }], details: {} };
        }

        // Back
        if (params.action === "back") {
          await browser.back();
          const url = await browser.getUrl();
          return { content: [{ type: "text", text: "Navigated back" }], details: { url } };
        }

        // Forward
        if (params.action === "forward") {
          await browser.forward();
          const url = await browser.getUrl();
          return { content: [{ type: "text", text: "Navigated forward" }], details: { url } };
        }

        // Status
        if (params.action === "status") {
          const status = await browser.getStatus();
          return {
            content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
            details: status,
          };
        }

        // End
        if (params.action === "end") {
          await browser.end();
          weStartedBrowser = false;
          return { content: [{ type: "text", text: "Browser session ended" }], details: {} };
        }

        return {
          content: [{ type: "text", text: `Unknown action: ${params.action}` }],
          details: { error: "unknown_action" },
        };

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
          details: { error: message },
        };
      }
    },
  });

  // Lifecycle
  pi.on("session_shutdown", async (_event, _ctx) => {
    if (weStartedBrowser && browserInstance) {
      try {
        await browserInstance.end();
      } catch {
        // Ignore cleanup errors
      }
      weStartedBrowser = false;
    }
  });

  pi.registerToolDefinition({
    name: "browser",
    description: "Control local Chrome browser. Auto-creates contexts from URL domain. Chrome is visible so user can sign in when needed. Deterministic operations - click, type, observe, extract.",
    categories: ["browser", "automation", "web"],
    examples: [
      { prompt: "navigate to twitter.com", description: "Open Twitter, auto-create 'twitter' context" },
      { prompt: "observe", description: "See all clickable elements on page" },
      { prompt: "click #login", description: "Click element by selector" },
      { prompt: "type #username myuser", description: "Type into input field" },
      { prompt: "extract .price", description: "Get text from element" },
    ],
  });
}

export type BrowserBaseExtension = typeof browserBaseExtension;