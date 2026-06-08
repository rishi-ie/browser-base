import * as fs from 'fs-extra';
export async function installGeneric(options, config) {
    const { configPath, configFormat, mcpKey, entryTemplate } = config;
    if (!await fs.pathExists(configPath)) {
        return {
            success: false,
            message: `Config file not found at ${configPath}`,
        };
    }
    let configData;
    try {
        configData = await fs.readJson(configPath);
    }
    catch {
        configData = {};
    }
    // Add MCP server config
    if (configFormat === 'json') {
        if (!configData || typeof configData !== 'object') {
            configData = {};
        }
        configData[mcpKey] = entryTemplate;
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
//# sourceMappingURL=generic.js.map