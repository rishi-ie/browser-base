import { installClaudeDesktop } from './claudeDesktop.js';
import { installCursor } from './cursor.js';
import { installVSCode } from './vscode.js';

export interface InstallResult {
  success: boolean;
  message: string;
  configPath?: string;
}

export interface InstallOptions {
  agent?: string;
  dryRun?: boolean;
}

export async function installBrowserBase(options: InstallOptions): Promise<Record<string, InstallResult>> {
  const { agent: targetAgent } = options;
  const results: Record<string, InstallResult> = {};
  
  const agents = targetAgent === 'all' 
    ? ['claude-desktop', 'cursor', 'vscode']
    : [targetAgent!];
  
  for (const agent of agents) {
    try {
      switch (agent) {
        case 'claude-desktop':
          results[agent] = await installClaudeDesktop(options);
          break;
        case 'cursor':
          results[agent] = await installCursor(options);
          break;
        case 'vscode':
          results[agent] = await installVSCode(options);
          break;
      }
    } catch (err) {
      results[agent] = { success: false, message: `Error: ${err}` };
    }
  }
  
  return results;
}
