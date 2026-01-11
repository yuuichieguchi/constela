/**
 * Test module for Config Loader.
 *
 * Coverage:
 * - loadConfig: Load constela.config.json from project root
 * - resolveConfig: Merge CLI options with file config
 * - Happy path: load config, return empty object when file doesn't exist
 * - Edge cases: partial config, empty CLI options, empty file config
 * - Error handling: invalid JSON, file read errors
 *
 * TDD Red Phase: These tests verify the config loading functionality
 * that will be implemented to support configuration in Constela Start.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';

// Import the module under test (will fail until implemented)
import {
  loadConfig,
  resolveConfig,
  type ConstelaConfigFile,
  type CLIOptions,
} from '../config-loader.js';

// Mock node:fs module
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

// ==================== Test Fixtures ====================

const FULL_CONFIG: ConstelaConfigFile = {
  css: ['./src/styles/global.css', './src/styles/components.css'],
  layoutsDir: './src/layouts',
  routesDir: './src/pages',
  publicDir: './public',
  build: {
    outDir: './dist',
  },
  dev: {
    port: 3000,
    host: 'localhost',
  },
};

const PARTIAL_CONFIG: ConstelaConfigFile = {
  css: './src/styles/main.css',
  routesDir: './src/routes',
};

const MINIMAL_CONFIG: ConstelaConfigFile = {
  dev: {
    port: 8080,
  },
};

const FULL_CLI_OPTIONS: CLIOptions = {
  css: './cli-styles.css',
  layoutsDir: './cli-layouts',
  routesDir: './cli-routes',
  publicDir: './cli-public',
  outDir: './cli-dist',
  port: 4000,
  host: '0.0.0.0',
};

// ==================== Tests ====================

describe('loadConfig', () => {
  // ==================== Setup ====================

  beforeEach(async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReset();
    vi.mocked(fs.readFileSync).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== Happy Path ====================

  describe('when config file exists', () => {
    it('should load constela.config.json from project root', async () => {
      // Arrange
      const projectRoot = '/project';
      const expectedPath = join(projectRoot, 'constela.config.json');

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(FULL_CONFIG));

      // Act
      const config = await loadConfig(projectRoot);

      // Assert
      expect(fs.existsSync).toHaveBeenCalledWith(expectedPath);
      expect(fs.readFileSync).toHaveBeenCalledWith(expectedPath, 'utf-8');
      expect(config).toEqual(FULL_CONFIG);
    });

    it('should load all config properties correctly', async () => {
      // Arrange
      const projectRoot = '/project';

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(FULL_CONFIG));

      // Act
      const config = await loadConfig(projectRoot);

      // Assert
      expect(config.css).toEqual(['./src/styles/global.css', './src/styles/components.css']);
      expect(config.layoutsDir).toBe('./src/layouts');
      expect(config.routesDir).toBe('./src/pages');
      expect(config.publicDir).toBe('./public');
      expect(config.build?.outDir).toBe('./dist');
      expect(config.dev?.port).toBe(3000);
      expect(config.dev?.host).toBe('localhost');
    });

    it('should handle config with only some properties defined', async () => {
      // Arrange
      const projectRoot = '/project';

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(PARTIAL_CONFIG));

      // Act
      const config = await loadConfig(projectRoot);

      // Assert
      expect(config.css).toBe('./src/styles/main.css');
      expect(config.routesDir).toBe('./src/routes');
      expect(config.layoutsDir).toBeUndefined();
      expect(config.publicDir).toBeUndefined();
      expect(config.build).toBeUndefined();
      expect(config.dev).toBeUndefined();
    });

    it('should handle css as single string value', async () => {
      // Arrange
      const projectRoot = '/project';
      const configWithStrCss: ConstelaConfigFile = {
        css: './styles/global.css',
      };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(configWithStrCss));

      // Act
      const config = await loadConfig(projectRoot);

      // Assert
      expect(config.css).toBe('./styles/global.css');
      expect(typeof config.css).toBe('string');
    });

    it('should handle css as array of strings', async () => {
      // Arrange
      const projectRoot = '/project';
      const configWithArrayCss: ConstelaConfigFile = {
        css: ['./a.css', './b.css', './c.css'],
      };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(configWithArrayCss));

      // Act
      const config = await loadConfig(projectRoot);

      // Assert
      expect(Array.isArray(config.css)).toBe(true);
      expect(config.css).toHaveLength(3);
    });
  });

  // ==================== Edge Cases ====================

  describe('when config file does not exist', () => {
    it('should return empty object when config file does not exist', async () => {
      // Arrange
      const projectRoot = '/project';

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act
      const config = await loadConfig(projectRoot);

      // Assert
      expect(config).toEqual({});
      expect(Object.keys(config)).toHaveLength(0);
    });

    it('should not attempt to read file when it does not exist', async () => {
      // Arrange
      const projectRoot = '/project';

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      // Act
      await loadConfig(projectRoot);

      // Assert
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });
  });

  describe('when config file is empty object', () => {
    it('should return empty object for empty JSON object', async () => {
      // Arrange
      const projectRoot = '/project';

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{}');

      // Act
      const config = await loadConfig(projectRoot);

      // Assert
      expect(config).toEqual({});
    });
  });

  // ==================== Error Handling ====================

  describe('when config file contains invalid JSON', () => {
    it('should throw error for invalid JSON in config file', async () => {
      // Arrange
      const projectRoot = '/project';

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');

      // Act & Assert
      await expect(loadConfig(projectRoot)).rejects.toThrow(/invalid json/i);
    });

    it('should throw error for malformed JSON with trailing comma', async () => {
      // Arrange
      const projectRoot = '/project';

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{"key": "value",}');

      // Act & Assert
      await expect(loadConfig(projectRoot)).rejects.toThrow(/invalid json/i);
    });

    it('should include file path in error message for invalid JSON', async () => {
      // Arrange
      const projectRoot = '/project';
      const expectedPath = join(projectRoot, 'constela.config.json');

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('not valid json');

      // Act & Assert
      try {
        await loadConfig(projectRoot);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain(expectedPath);
      }
    });
  });

  describe('when file read fails', () => {
    it('should throw error when file read fails', async () => {
      // Arrange
      const projectRoot = '/project';

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      // Act & Assert
      await expect(loadConfig(projectRoot)).rejects.toThrow(/failed to read|permission denied/i);
    });
  });
});

// ==================== cssContent Tests ====================

describe('ConstelaConfigFile cssContent property', () => {
  beforeEach(async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReset();
    vi.mocked(fs.readFileSync).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when config file contains cssContent', () => {
    it('should load cssContent as string array from config file', async () => {
      /**
       * Given: A config file with cssContent array
       * When: loadConfig is called
       * Then: cssContent should be loaded as string array
       */
      // Arrange
      const projectRoot = '/project';
      const configWithCssContent: ConstelaConfigFile = {
        css: './src/styles/main.css',
        cssContent: ['./src/**/*.tsx', './src/**/*.json'],
      };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(configWithCssContent));

      // Act
      const config = await loadConfig(projectRoot);

      // Assert
      expect(config.cssContent).toBeDefined();
      expect(Array.isArray(config.cssContent)).toBe(true);
      expect(config.cssContent).toEqual(['./src/**/*.tsx', './src/**/*.json']);
    });

    it('should handle empty cssContent array', async () => {
      /**
       * Given: A config file with empty cssContent array
       * When: loadConfig is called
       * Then: cssContent should be an empty array
       */
      // Arrange
      const projectRoot = '/project';
      const configWithEmptyCssContent: ConstelaConfigFile = {
        css: './src/styles/main.css',
        cssContent: [],
      };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(configWithEmptyCssContent));

      // Act
      const config = await loadConfig(projectRoot);

      // Assert
      expect(config.cssContent).toEqual([]);
    });

    it('should load full config with cssContent property', async () => {
      /**
       * Given: A full config file including cssContent
       * When: loadConfig is called
       * Then: All properties including cssContent should be loaded
       */
      // Arrange
      const projectRoot = '/project';
      const fullConfigWithCssContent: ConstelaConfigFile = {
        css: ['./src/styles/global.css', './src/styles/components.css'],
        cssContent: ['./src/**/*.tsx', './components/**/*.tsx'],
        layoutsDir: './src/layouts',
        routesDir: './src/pages',
        publicDir: './public',
        build: {
          outDir: './dist',
        },
        dev: {
          port: 3000,
          host: 'localhost',
        },
      };

      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(fullConfigWithCssContent));

      // Act
      const config = await loadConfig(projectRoot);

      // Assert
      expect(config.css).toEqual(['./src/styles/global.css', './src/styles/components.css']);
      expect(config.cssContent).toEqual(['./src/**/*.tsx', './components/**/*.tsx']);
      expect(config.layoutsDir).toBe('./src/layouts');
    });
  });
});

describe('resolveConfig', () => {
  // ==================== Setup ====================

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== Happy Path ====================

  describe('when merging CLI options with file config', () => {
    it('should merge CLI options with file config', async () => {
      // Arrange
      const fileConfig: ConstelaConfigFile = {
        css: './file-styles.css',
        routesDir: './file-routes',
        dev: {
          port: 3000,
        },
      };
      const cliOptions: CLIOptions = {
        port: 4000,
        host: '0.0.0.0',
      };

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert
      expect(resolved.css).toBe('./file-styles.css');
      expect(resolved.routesDir).toBe('./file-routes');
      expect(resolved.dev?.port).toBe(4000);
      expect(resolved.dev?.host).toBe('0.0.0.0');
    });

    it('should give CLI options precedence over file config', async () => {
      // Arrange
      const fileConfig: ConstelaConfigFile = {
        css: './file-styles.css',
        layoutsDir: './file-layouts',
        routesDir: './file-routes',
        publicDir: './file-public',
        build: {
          outDir: './file-dist',
        },
        dev: {
          port: 3000,
          host: 'localhost',
        },
      };
      const cliOptions: CLIOptions = {
        css: './cli-styles.css',
        layoutsDir: './cli-layouts',
        routesDir: './cli-routes',
        publicDir: './cli-public',
        outDir: './cli-dist',
        port: 4000,
        host: '0.0.0.0',
      };

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert
      expect(resolved.css).toBe('./cli-styles.css');
      expect(resolved.layoutsDir).toBe('./cli-layouts');
      expect(resolved.routesDir).toBe('./cli-routes');
      expect(resolved.publicDir).toBe('./cli-public');
      expect(resolved.build?.outDir).toBe('./cli-dist');
      expect(resolved.dev?.port).toBe(4000);
      expect(resolved.dev?.host).toBe('0.0.0.0');
    });
  });

  describe('when preserving file config values', () => {
    it('should preserve file config values when CLI option is undefined', async () => {
      // Arrange
      const fileConfig: ConstelaConfigFile = {
        css: ['./a.css', './b.css'],
        layoutsDir: './layouts',
        routesDir: './routes',
        publicDir: './public',
        build: {
          outDir: './dist',
        },
        dev: {
          port: 3000,
          host: 'localhost',
        },
      };
      const cliOptions: CLIOptions = {
        port: 4000,
        // other options are undefined
      };

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert
      expect(resolved.css).toEqual(['./a.css', './b.css']);
      expect(resolved.layoutsDir).toBe('./layouts');
      expect(resolved.routesDir).toBe('./routes');
      expect(resolved.publicDir).toBe('./public');
      expect(resolved.build?.outDir).toBe('./dist');
      expect(resolved.dev?.port).toBe(4000);
      expect(resolved.dev?.host).toBe('localhost');
    });

    it('should not override with undefined CLI values', async () => {
      // Arrange
      const fileConfig: ConstelaConfigFile = {
        css: './styles.css',
        routesDir: './pages',
      };
      const cliOptions: CLIOptions = {
        css: undefined,
        routesDir: undefined,
        port: 5000,
      };

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert
      expect(resolved.css).toBe('./styles.css');
      expect(resolved.routesDir).toBe('./pages');
      expect(resolved.dev?.port).toBe(5000);
    });
  });

  // ==================== Edge Cases ====================

  describe('when CLI options are empty', () => {
    it('should handle empty CLI options', async () => {
      // Arrange
      const fileConfig: ConstelaConfigFile = FULL_CONFIG;
      const cliOptions: CLIOptions = {};

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert
      expect(resolved).toEqual(FULL_CONFIG);
    });

    it('should return file config when CLI options is undefined', async () => {
      // Arrange
      const fileConfig: ConstelaConfigFile = FULL_CONFIG;
      const cliOptions = undefined;

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert
      expect(resolved).toEqual(FULL_CONFIG);
    });
  });

  describe('when file config is empty', () => {
    it('should handle empty file config', async () => {
      // Arrange
      const fileConfig: ConstelaConfigFile = {};
      const cliOptions: CLIOptions = {
        port: 3000,
        host: 'localhost',
        routesDir: './src/pages',
      };

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert
      expect(resolved.dev?.port).toBe(3000);
      expect(resolved.dev?.host).toBe('localhost');
      expect(resolved.routesDir).toBe('./src/pages');
    });

    it('should create nested structures from CLI options when file config is empty', async () => {
      // Arrange
      const fileConfig: ConstelaConfigFile = {};
      const cliOptions: CLIOptions = {
        outDir: './build',
        port: 8080,
      };

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert
      expect(resolved.build).toBeDefined();
      expect(resolved.build?.outDir).toBe('./build');
      expect(resolved.dev).toBeDefined();
      expect(resolved.dev?.port).toBe(8080);
    });
  });

  describe('when both file config and CLI options are empty', () => {
    it('should return empty object when both are empty', async () => {
      // Arrange
      const fileConfig: ConstelaConfigFile = {};
      const cliOptions: CLIOptions = {};

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert
      expect(resolved).toEqual({});
    });
  });

  // ==================== cssContent Merging ====================

  describe('when merging cssContent', () => {
    it('should preserve cssContent from file config when CLI does not provide it', async () => {
      /**
       * Given: A file config with cssContent array
       * When: CLI options do not include cssContent
       * Then: File config cssContent should be preserved
       */
      // Arrange
      const fileConfig: ConstelaConfigFile = {
        css: './styles.css',
        cssContent: ['./src/**/*.tsx', './components/**/*.tsx'],
      };
      const cliOptions: CLIOptions = {
        port: 3000,
      };

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert
      expect(resolved.cssContent).toEqual(['./src/**/*.tsx', './components/**/*.tsx']);
    });

    it('should convert CLI cssContent string to array and override file config', async () => {
      /**
       * Given: A file config with cssContent and CLI with cssContent string
       * When: resolveConfig is called
       * Then: CLI cssContent should be converted to array and take precedence
       */
      // Arrange
      const fileConfig: ConstelaConfigFile = {
        css: './styles.css',
        cssContent: ['./old/**/*.tsx'],
      };
      const cliOptions: CLIOptions = {
        cssContent: './new/**/*.tsx',
      };

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert
      expect(resolved.cssContent).toEqual(['./new/**/*.tsx']);
    });

    it('should handle CLI cssContent when file config has no cssContent', async () => {
      /**
       * Given: A file config without cssContent
       * When: CLI provides cssContent
       * Then: CLI cssContent should be used (converted to array)
       */
      // Arrange
      const fileConfig: ConstelaConfigFile = {
        css: './styles.css',
      };
      const cliOptions: CLIOptions = {
        cssContent: './src/**/*.tsx',
      };

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert
      expect(resolved.cssContent).toEqual(['./src/**/*.tsx']);
    });

    it('should not modify cssContent when both file config and CLI are empty', async () => {
      /**
       * Given: A file config without cssContent and CLI without cssContent
       * When: resolveConfig is called
       * Then: cssContent should be undefined
       */
      // Arrange
      const fileConfig: ConstelaConfigFile = {
        css: './styles.css',
      };
      const cliOptions: CLIOptions = {};

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert
      expect(resolved.cssContent).toBeUndefined();
    });

    it('should handle comma-separated CLI cssContent values', async () => {
      // Given: CLI cssContent with comma-separated paths
      // When: resolveConfig is called
      // Then: CSS content paths should be split into array
      // Note: This tests --cssContent "./src/[glob].tsx,./components/[glob].tsx"
      // Arrange
      const fileConfig: ConstelaConfigFile = {};
      const cliOptions: CLIOptions = {
        cssContent: './src/**/*.tsx,./components/**/*.tsx',
      };

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert - should split comma-separated values into array
      expect(resolved.cssContent).toEqual(['./src/**/*.tsx', './components/**/*.tsx']);
    });

    it('should trim whitespace from comma-separated CLI cssContent values', async () => {
      // Given: CLI cssContent with spaces around commas
      // When: resolveConfig is called
      // Then: CSS content paths should be trimmed and split into array
      // Arrange
      const fileConfig: ConstelaConfigFile = {};
      const cliOptions: CLIOptions = {
        cssContent: './src/**/*.tsx, ./components/**/*.tsx , ./pages/**/*.tsx',
      };

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert - should trim whitespace from each path
      expect(resolved.cssContent).toEqual([
        './src/**/*.tsx',
        './components/**/*.tsx',
        './pages/**/*.tsx',
      ]);
    });

    it('should filter empty strings from comma-separated CLI cssContent values', async () => {
      // Given: CLI cssContent with trailing comma or double commas
      // When: resolveConfig is called
      // Then: Empty strings should be filtered out
      // Arrange
      const fileConfig: ConstelaConfigFile = {};
      const cliOptions: CLIOptions = {
        cssContent: './src/**/*.tsx,,./components/**/*.tsx,',
      };

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert - should filter empty strings
      expect(resolved.cssContent).toEqual(['./src/**/*.tsx', './components/**/*.tsx']);
    });
  });

  // ==================== Nested Object Merging ====================

  describe('when merging nested build config', () => {
    it('should merge build.outDir from CLI', async () => {
      // Arrange
      const fileConfig: ConstelaConfigFile = {
        build: {
          outDir: './file-dist',
        },
      };
      const cliOptions: CLIOptions = {
        outDir: './cli-dist',
      };

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert
      expect(resolved.build?.outDir).toBe('./cli-dist');
    });
  });

  describe('when merging nested dev config', () => {
    it('should merge dev.port and dev.host from CLI', async () => {
      // Arrange
      const fileConfig: ConstelaConfigFile = {
        dev: {
          port: 3000,
          host: 'localhost',
        },
      };
      const cliOptions: CLIOptions = {
        port: 8080,
        // host not specified
      };

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert
      expect(resolved.dev?.port).toBe(8080);
      expect(resolved.dev?.host).toBe('localhost');
    });

    it('should merge both port and host from CLI when both specified', async () => {
      // Arrange
      const fileConfig: ConstelaConfigFile = {
        dev: {
          port: 3000,
          host: 'localhost',
        },
      };
      const cliOptions: CLIOptions = {
        port: 4000,
        host: '0.0.0.0',
      };

      // Act
      const resolved = await resolveConfig(fileConfig, cliOptions);

      // Assert
      expect(resolved.dev?.port).toBe(4000);
      expect(resolved.dev?.host).toBe('0.0.0.0');
    });
  });
});
