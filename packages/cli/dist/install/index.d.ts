export interface InstallResult {
    success: boolean;
    message: string;
    configPath?: string;
}
export interface InstallOptions {
    agent?: string;
    dryRun?: boolean;
}
export declare function installBrowserBase(options: InstallOptions): Promise<Record<string, InstallResult>>;
//# sourceMappingURL=index.d.ts.map