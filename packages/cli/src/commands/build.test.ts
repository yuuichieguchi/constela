/**
 * Test module for CLI Build Command.
 *
 * Coverage:
 * - Happy path: config-loader routesDir/publicDir passed to build()
 * - CLI options override config values
 * - Error handling: config load failures, build failures
 *
 * TDD Red Phase: These tests verify that the CLI build command
 * integrates with config-loader to pass configuration to build().
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock @constela/start module
vi.mock('@constela/start', () => ({
  build: vi.fn().mockResolvedValue({
    outDir: 'dist',
    routes: [],
    generatedFiles: [],
  }),
  loadConfig: vi.fn().mockResolvedValue({}),
  resolveConfig: vi.fn().mockImplementation((fileConfig, _cliOptions) => fileConfig),
}));

// Import after mocking
import { buildCommand, type BuildCommandOptions } from './build.js';
import { build, loadConfig, resolveConfig } from '@constela/start';

// ==================== Test Fixtures ====================

const FULL_CONFIG = {
  css: './src/styles/global.css',
  layoutsDir: './src/layouts',
  routesDir: './src/pages',
  publicDir: './public',
  build: {
    outDir: './dist',
  },
};

const PARTIAL_CONFIG = {
  routesDir: './custom/routes',
  publicDir: './custom/public',
};

// ==================== Tests ====================

describe('buildCommand with config-loader integration', () => {
  // ==================== Setup ====================

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Happy Path ====================

  describe('when config file contains routesDir and publicDir', () => {
    it('should load config from project root', async () => {
      /**
       * Given: A project with constela.config.json
       * When: buildCommand is executed
       * Then: loadConfig should be called to load the config
       */
      // Arrange
      vi.mocked(loadConfig).mockResolvedValue(FULL_CONFIG);
      vi.mocked(resolveConfig).mockResolvedValue(FULL_CONFIG);
      vi.mocked(build).mockResolvedValue({
        outDir: 'dist',
        routes: [],
        generatedFiles: [],
      });

      const options: BuildCommandOptions = {};

      // Act
      await buildCommand(options);

      // Assert
      expect(loadConfig).toHaveBeenCalledWith(process.cwd());
    });

    it('should pass routesDir from config to build()', async () => {
      /**
       * Given: Config file with routesDir set to './src/pages'
       * When: buildCommand is executed
       * Then: build() should receive routesDir: './src/pages'
       */
      // Arrange
      vi.mocked(loadConfig).mockResolvedValue(PARTIAL_CONFIG);
      vi.mocked(resolveConfig).mockResolvedValue(PARTIAL_CONFIG);
      vi.mocked(build).mockResolvedValue({
        outDir: 'dist',
        routes: [],
        generatedFiles: [],
      });

      const options: BuildCommandOptions = {};

      // Act
      await buildCommand(options);

      // Assert
      expect(build).toHaveBeenCalledWith(
        expect.objectContaining({
          routesDir: './custom/routes',
        })
      );
    });

    it('should pass publicDir from config to build()', async () => {
      /**
       * Given: Config file with publicDir set to './public'
       * When: buildCommand is executed
       * Then: build() should receive publicDir: './public'
       */
      // Arrange
      vi.mocked(loadConfig).mockResolvedValue(PARTIAL_CONFIG);
      vi.mocked(resolveConfig).mockResolvedValue(PARTIAL_CONFIG);
      vi.mocked(build).mockResolvedValue({
        outDir: 'dist',
        routes: [],
        generatedFiles: [],
      });

      const options: BuildCommandOptions = {};

      // Act
      await buildCommand(options);

      // Assert
      expect(build).toHaveBeenCalledWith(
        expect.objectContaining({
          publicDir: './custom/public',
        })
      );
    });

    it('should pass all config options to build()', async () => {
      /**
       * Given: Config file with routesDir, publicDir, layoutsDir
       * When: buildCommand is executed
       * Then: build() should receive all config options
       */
      // Arrange
      vi.mocked(loadConfig).mockResolvedValue(FULL_CONFIG);
      vi.mocked(resolveConfig).mockResolvedValue(FULL_CONFIG);
      vi.mocked(build).mockResolvedValue({
        outDir: './dist',
        routes: [],
        generatedFiles: [],
      });

      const options: BuildCommandOptions = {};

      // Act
      await buildCommand(options);

      // Assert
      expect(build).toHaveBeenCalledWith(
        expect.objectContaining({
          routesDir: './src/pages',
          publicDir: './public',
          layoutsDir: './src/layouts',
          outDir: './dist',
        })
      );
    });
  });

  // ==================== CLI Override ====================

  describe('when CLI options override config values', () => {
    it('should use CLI outDir over config outDir', async () => {
      /**
       * Given: Config file with outDir: './dist'
       * When: buildCommand is executed with --outDir './build'
       * Then: build() should receive outDir: './build'
       */
      // Arrange
      const configWithOutDir = {
        ...PARTIAL_CONFIG,
        build: { outDir: './dist' },
      };
      const mergedConfig = {
        ...PARTIAL_CONFIG,
        build: { outDir: './build' },
      };

      vi.mocked(loadConfig).mockResolvedValue(configWithOutDir);
      vi.mocked(resolveConfig).mockResolvedValue(mergedConfig);
      vi.mocked(build).mockResolvedValue({
        outDir: './build',
        routes: [],
        generatedFiles: [],
      });

      const options: BuildCommandOptions = {
        outDir: './build',
      };

      // Act
      await buildCommand(options);

      // Assert
      expect(resolveConfig).toHaveBeenCalledWith(
        configWithOutDir,
        expect.objectContaining({ outDir: './build' })
      );
      expect(build).toHaveBeenCalledWith(
        expect.objectContaining({
          outDir: './build',
        })
      );
    });

    it('should use CLI routesDir over config routesDir', async () => {
      /**
       * Given: Config file with routesDir: './src/pages'
       * When: buildCommand is executed with --routesDir './app/routes'
       * Then: build() should receive routesDir: './app/routes'
       */
      // Arrange
      const configWithRoutesDir = {
        routesDir: './src/pages',
      };
      const mergedConfig = {
        routesDir: './app/routes',
      };

      vi.mocked(loadConfig).mockResolvedValue(configWithRoutesDir);
      vi.mocked(resolveConfig).mockResolvedValue(mergedConfig);
      vi.mocked(build).mockResolvedValue({
        outDir: 'dist',
        routes: [],
        generatedFiles: [],
      });

      const options: BuildCommandOptions = {
        routesDir: './app/routes',
      };

      // Act
      await buildCommand(options);

      // Assert
      expect(resolveConfig).toHaveBeenCalledWith(
        configWithRoutesDir,
        expect.objectContaining({ routesDir: './app/routes' })
      );
      expect(build).toHaveBeenCalledWith(
        expect.objectContaining({
          routesDir: './app/routes',
        })
      );
    });

    it('should use CLI publicDir over config publicDir', async () => {
      /**
       * Given: Config file with publicDir: './public'
       * When: buildCommand is executed with --publicDir './static'
       * Then: build() should receive publicDir: './static'
       */
      // Arrange
      const configWithPublicDir = {
        publicDir: './public',
      };
      const mergedConfig = {
        publicDir: './static',
      };

      vi.mocked(loadConfig).mockResolvedValue(configWithPublicDir);
      vi.mocked(resolveConfig).mockResolvedValue(mergedConfig);
      vi.mocked(build).mockResolvedValue({
        outDir: 'dist',
        routes: [],
        generatedFiles: [],
      });

      const options: BuildCommandOptions = {
        publicDir: './static',
      };

      // Act
      await buildCommand(options);

      // Assert
      expect(resolveConfig).toHaveBeenCalledWith(
        configWithPublicDir,
        expect.objectContaining({ publicDir: './static' })
      );
      expect(build).toHaveBeenCalledWith(
        expect.objectContaining({
          publicDir: './static',
        })
      );
    });
  });

  // ==================== Edge Cases ====================

  describe('when config file does not exist', () => {
    it('should use default values when no config file exists', async () => {
      /**
       * Given: No constela.config.json exists
       * When: buildCommand is executed without CLI options
       * Then: build() should use default outDir: 'dist'
       */
      // Arrange
      vi.mocked(loadConfig).mockResolvedValue({});
      vi.mocked(resolveConfig).mockResolvedValue({});
      vi.mocked(build).mockResolvedValue({
        outDir: 'dist',
        routes: [],
        generatedFiles: [],
      });

      const options: BuildCommandOptions = {};

      // Act
      await buildCommand(options);

      // Assert
      expect(build).toHaveBeenCalledWith(
        expect.objectContaining({
          outDir: 'dist',
        })
      );
    });
  });

  describe('when config has partial values', () => {
    it('should merge config and CLI options correctly', async () => {
      /**
       * Given: Config with only routesDir, CLI with only outDir
       * When: buildCommand is executed
       * Then: build() should receive both values
       */
      // Arrange
      const partialConfig = {
        routesDir: './src/routes',
      };
      const mergedConfig = {
        routesDir: './src/routes',
        build: { outDir: './output' },
      };

      vi.mocked(loadConfig).mockResolvedValue(partialConfig);
      vi.mocked(resolveConfig).mockResolvedValue(mergedConfig);
      vi.mocked(build).mockResolvedValue({
        outDir: './output',
        routes: [],
        generatedFiles: [],
      });

      const options: BuildCommandOptions = {
        outDir: './output',
      };

      // Act
      await buildCommand(options);

      // Assert
      expect(build).toHaveBeenCalledWith(
        expect.objectContaining({
          routesDir: './src/routes',
          outDir: './output',
        })
      );
    });
  });

  // ==================== Error Handling ====================

  describe('when config loading fails', () => {
    it('should propagate error when loadConfig throws', async () => {
      /**
       * Given: loadConfig throws an error (e.g., invalid JSON)
       * When: buildCommand is executed
       * Then: The error should be propagated
       */
      // Arrange
      vi.mocked(loadConfig).mockRejectedValue(
        new Error('Invalid JSON in config file')
      );

      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      const options: BuildCommandOptions = {};

      // Act & Assert
      await expect(buildCommand(options)).rejects.toThrow();
      mockExit.mockRestore();
    });
  });

  describe('when build fails', () => {
    it('should handle build errors gracefully', async () => {
      /**
       * Given: build() throws an error
       * When: buildCommand is executed
       * Then: Error should be caught and process.exit(1) called
       */
      // Arrange
      vi.mocked(loadConfig).mockResolvedValue({});
      vi.mocked(resolveConfig).mockResolvedValue({});
      vi.mocked(build).mockRejectedValue(new Error('Build failed'));

      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      const options: BuildCommandOptions = {};

      // Act & Assert
      await expect(buildCommand(options)).rejects.toThrow('process.exit called');
      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });
  });
});
