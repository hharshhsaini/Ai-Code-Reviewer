/**
 * Configuration Loader
 * Parses action.yml inputs and validates configuration
 */
import { ActionConfig } from './types';
export declare class ConfigurationLoader {
    /**
     * Load and validate configuration from GitHub Actions inputs
     */
    static load(): ActionConfig;
    /**
     * Validate that required credentials are present
     */
    private static validateCredentials;
    /**
     * Determine provider based on which API key is provided
     */
    private static determineProvider;
}
//# sourceMappingURL=config-loader.d.ts.map