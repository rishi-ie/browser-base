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
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
/**
 * Pi extension factory.
 *
 * Install: Add to ~/.pi/agent/extensions/browser-base.ts
 * Or: pi install @browserbase/local (when published to npm)
 */
export default function browserBaseExtension(pi: ExtensionAPI): Promise<void>;
/**
 * Type definition for extension API (for reference).
 * The actual types come from @earendil-works/pi-coding-agent.
 */
export type BrowserBaseExtension = typeof browserBaseExtension;
