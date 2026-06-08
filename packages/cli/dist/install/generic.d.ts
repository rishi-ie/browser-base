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
export declare function installGeneric(options: InstallOptions, config: GenericInstallConfig): Promise<InstallResult>;
//# sourceMappingURL=generic.d.ts.map