import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
export async function installClaudeDesktop(options) {
    const configDir = os.platform() === 'darwin'
        ? path.join(os.homedir(), 'Library/Application Support/Claude')
        : path.join(os.homedir(), '.config/Claude');
    const configPath = path.join(configDir, 'claude_desktop_config.json');
    // Check if Claude Desktop is installed
    if (!await fs.pathExists(configPath)) {
        return {
            success: false,
            message: `Claude Desktop config not found at ${configPath}. Is Claude Desktop installed?`,
        };
    }
    // Read existing config
    let config = {};
    try {
        config = await fs.readJson(configPath);
    }
    catch {
        // File doesn't exist yet, start fresh
    }
    // Add MCP server config
    if (!config.mcpServers)
        config.mcpServers = {};
    config.mcpServers['browser-base'] = {
        command: 'npx',
        args: ['@browserbase/local-cli', 'start', '--context-dir', './browser-context'],
        env: {
            BROWSER_BASE_DEFAULT_CONTEXT: 'default',
            // Model API keys can be set here
        },
    };
    if (options.dryRun) {
        return {
            success: true,
            message: `Would write MCP config to ${configPath}`,
            configPath,
        };
    }
    await fs.writeJson(configPath, config, { spaces: 2 });
    return {
        success: true,
        message: `Installed at ${configPath}. Restart Claude Desktop to use.`,
        configPath,
    };
}
//# sourceMappingURL=claudeDesktop.js.map