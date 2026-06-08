import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import type { InstallOptions, InstallResult } from './index.js';

export async function installVSCode(options: InstallOptions): Promise<InstallResult> {
  const configDir = os.platform() === 'darwin'
    ? path.join(os.homedir(), 'Library/Application Support/Code/User')
    : os.platform() === 'win32'
    ? path.join(os.homedir(), 'AppData/Roaming/Code/User')
    : path.join(os.homedir(), '.config/Code/User');
  
  const configPath = path.join(configDir, 'mcp.json');
  
  if (!await fs.pathExists(configDir)) {
    return {
      success: false,
      message: 'VS Code not found. Is VS Code installed?',
    };
  }
  
  let config: unknown[] = [];
  try {
    config = await fs.readJson(configPath);
  } catch {
    config = [];
  }
  
  // Check if already installed
  const existing = (config as Array<{mcpServer?: {command?: string}}>).find(
    (s) => s.mcpServer?.command?.includes('browser-base')
  );
  if (existing) {
    return {
      success: false,
      message: 'browser-base is already installed in VS Code. Remove it from the MCP settings first.',
    };
  }
  
  const mcpEntry = {
    mcpServer: {
      command: 'npx',
      args: ['@browserbase/local-cli', 'start', '--context-dir', './browser-context'],
      env: {
        BROWSER_BASE_DEFAULT_CONTEXT: 'default',
      },
    },
  };
  
  if (options.dryRun) {
    return {
      success: true,
      message: `Would write MCP config to ${configPath}`,
      configPath,
    };
  }
  
  await fs.writeJson(configPath, [...config, mcpEntry], { spaces: 2 });
  
  return {
    success: true,
    message: `Installed at ${configPath}. Restart VS Code to use.`,
    configPath,
  };
}
