import * as fs from 'fs-extra';
import * as path from 'path';
export async function readMcpConfig(configPath) {
    try {
        return await fs.readJson(configPath);
    }
    catch {
        return {};
    }
}
export async function writeMcpConfig(configPath, config) {
    await fs.writeJson(configPath, config, { spaces: 2 });
}
export function getMcpConfigPath(agent) {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    switch (agent) {
        case 'claude-desktop':
            return process.platform === 'darwin'
                ? path.join(home, 'Library/Application Support/Claude/claude_desktop_config.json')
                : path.join(home, '.config/Claude/claude_desktop_config.json');
        case 'cursor':
            return path.join(home, '.cursor/mcp.json');
        case 'vscode':
            return process.platform === 'darwin'
                ? path.join(home, 'Library/Application Support/Code/User/mcp.json')
                : process.platform === 'win32'
                    ? path.join(home, 'AppData/Roaming/Code/User/mcp.json')
                    : path.join(home, '.config/Code/User/mcp.json');
        default:
            throw new Error(`Unknown agent: ${agent}`);
    }
}
//# sourceMappingURL=configFile.js.map