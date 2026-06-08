export interface McpConfig {
    mcpServers?: Record<string, {
        command: string;
        args?: string[];
        env?: Record<string, string>;
    }>;
}
export declare function readMcpConfig(configPath: string): Promise<McpConfig>;
export declare function writeMcpConfig(configPath: string, config: McpConfig): Promise<void>;
export declare function getMcpConfigPath(agent: 'claude-desktop' | 'cursor' | 'vscode'): string;
//# sourceMappingURL=configFile.d.ts.map