import * as fs from 'fs-extra';
import * as path from 'path';
import type { InstallOptions, InstallResult } from './index.js';

export interface GenericInstallConfig {
  configPath: string;
  configFormat: 'json' | 'yaml';
  mcpKey: string;
  entryTemplate: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };
}

export async function installGeneric(
  options: InstallOptions,
  config: GenericInstallConfig
): Promise<InstallResult> {
  const { configPath, configFormat, mcpKey, entryTemplate } = config;
  
  if (!await fs.pathExists(configPath)) {
    return {
      success: false,
      message: `Config file not found at ${configPath}`,
    };
  }
  
  let configData: unknown;
  try {
    configData = await fs.readJson(configPath);
  } catch {
    configData = {};
  }
  
  // Add MCP server config
  if (configFormat === 'json') {
    if (!configData || typeof configData !== 'object') {
      configData = {};
    }
    (configData as Record<string, unknown>)[mcpKey] = entryTemplate;
  }
  
  if (options.dryRun) {
    return {
      success: true,
      message: `Would write MCP config to ${configPath}`,
      configPath,
    };
  }
  
  await fs.writeJson(configPath, configData, { spaces: 2 });
  
  return {
    success: true,
    message: `Installed at ${configPath}`,
    configPath,
  };
}
