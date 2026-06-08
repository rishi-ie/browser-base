// Tool registry - all MCP tools exported as an array
export { startTool } from './start.js';
export { endTool } from './end.js';
export { useContextTool } from './useContext.js';
export { navigateTool } from './navigate.js';
export { actTool } from './act.js';
export { observeTool } from './observe.js';
export { extractTool } from './extract.js';

import { startTool } from './start.js';
import { endTool } from './end.js';
import { useContextTool } from './useContext.js';
import { navigateTool } from './navigate.js';
import { actTool } from './act.js';
import { observeTool } from './observe.js';
import { extractTool } from './extract.js';

/**
 * All available MCP tools.
 */
export const TOOLS = [
  startTool,
  endTool,
  useContextTool,
  navigateTool,
  actTool,
  observeTool,
  extractTool,
];