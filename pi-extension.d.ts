/**
 * Type declarations for pi-extension.ts
 * 
 * This file provides TypeScript types for the pi agent extension.
 * The actual implementation is in pi-extension.ts (run via jiti by pi).
 * 
 * Usage with pi agent:
 * 1. Copy pi-extension.ts to ~/.pi/agent/extensions/
 * 2. Or reference via: import type { BrowserBaseExtension } from '@browserbase/local/pi-extension'
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * browser-base pi extension factory function.
 * 
 * This extension registers:
 * - `browser` tool: Unified tool for all browser actions
 * - `/browser-contexts` command: List available contexts
 * - `/browser-create-context` command: Create new context (via CLI)
 * 
 * @param pi - The pi extension API
 */
declare const browserBaseExtension: (pi: ExtensionAPI) => Promise<void>;

export default browserBaseExtension;
export type BrowserBaseExtension = typeof browserBaseExtension;
