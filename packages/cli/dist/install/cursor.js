import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
export async function installCursor(options) {
    const configPath = path.join(os.homedir(), '.cursor/mcp.json');
    if (!await fs.pathExists(path.dirname(configPath))) {
        return {
            success: false,
            message: 'Cursor not found. Is Cursor installed?',
        };
    }
    let config = [];
    try {
        config = await fs.readJson(configPath);
    }
    catch {
        config = [];
    }
    // Check if already installed
    const existing = config.find((s) => s.mcpServer?.command?.includes('browser-base'));
    if (existing) {
        return {
            success: false,
            message: 'browser-base is already installed in Cursor. Remove it from ~/.cursor/mcp.json first.',
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
        message: `Installed at ${configPath}. Restart Cursor to use.`,
        configPath,
    };
}
//# sourceMappingURL=cursor.js.map