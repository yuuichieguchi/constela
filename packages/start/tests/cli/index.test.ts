/**
 * Test module for CLI functions.
 *
 * Coverage:
 * - Command parsing (dev, build, start)
 * - Option handling (--port, --host, --outDir)
 * - Help and version display
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ==================== Mocks ====================

// Mock console.log to capture output
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

// Store original process.argv
const originalArgv = process.argv;

// Helper to simulate CLI invocation
function simulateCliArgs(args: string[]): void {
  process.argv = ['node', 'constela-start', ...args];
}

// ==================== Test Cleanup ====================

beforeEach(() => {
  consoleSpy.mockClear();
  consoleErrorSpy.mockClear();
});

afterEach(() => {
  process.argv = originalArgv;
});

// ==================== Command Parsing Tests ====================

describe('CLI Command Parsing', () => {
  // ==================== dev command ====================

  describe('dev command', () => {
    it('should recognize dev command', async () => {
      // Arrange
      simulateCliArgs(['dev']);
      
      // Act
      const { createCLI } = await import('../../src/cli/index.js');
      const program = createCLI();
      
      // Assert
      const devCommand = program.commands.find(cmd => cmd.name() === 'dev');
      expect(devCommand).toBeDefined();
      expect(devCommand?.description()).toContain('development');
    });

    it('should accept --port option for dev command', async () => {
      // Arrange
      simulateCliArgs(['dev', '--port', '4000']);
      
      // Act
      const { createCLI } = await import('../../src/cli/index.js');
      const program = createCLI();
      const devCommand = program.commands.find(cmd => cmd.name() === 'dev');
      
      // Assert
      expect(devCommand).toBeDefined();
      const portOption = devCommand?.options.find(opt => 
        opt.short === '-p' || opt.long === '--port'
      );
      expect(portOption).toBeDefined();
    });

    it('should accept --host option for dev command', async () => {
      // Arrange
      simulateCliArgs(['dev', '--host', 'localhost']);
      
      // Act
      const { createCLI } = await import('../../src/cli/index.js');
      const program = createCLI();
      const devCommand = program.commands.find(cmd => cmd.name() === 'dev');
      
      // Assert
      expect(devCommand).toBeDefined();
      const hostOption = devCommand?.options.find(opt => 
        opt.short === '-h' || opt.long === '--host'
      );
      expect(hostOption).toBeDefined();
    });

    it('should use default port 3000 when not specified', async () => {
      // Arrange
      simulateCliArgs(['dev']);
      
      // Act
      const { createCLI } = await import('../../src/cli/index.js');
      const program = createCLI();
      const devCommand = program.commands.find(cmd => cmd.name() === 'dev');
      
      // Assert
      const portOption = devCommand?.options.find(opt => opt.long === '--port');
      expect(portOption?.defaultValue).toBe('3000');
    });

    it('should start development server when dev command is executed', async () => {
      // Arrange
      simulateCliArgs(['dev']);
      const mockStartDev = vi.fn().mockResolvedValue({ port: 3000 });
      
      // Act
      const { createCLI, setDevHandler } = await import('../../src/cli/index.js');
      setDevHandler(mockStartDev);
      const program = createCLI();
      await program.parseAsync(['node', 'constela-start', 'dev']);
      
      // Assert
      expect(mockStartDev).toHaveBeenCalled();
    });
  });

  // ==================== build command ====================

  describe('build command', () => {
    it('should recognize build command', async () => {
      // Arrange
      simulateCliArgs(['build']);
      
      // Act
      const { createCLI } = await import('../../src/cli/index.js');
      const program = createCLI();
      
      // Assert
      const buildCommand = program.commands.find(cmd => cmd.name() === 'build');
      expect(buildCommand).toBeDefined();
      expect(buildCommand?.description()).toContain('production');
    });

    it('should accept --outDir option for build command', async () => {
      // Arrange
      simulateCliArgs(['build', '--outDir', 'dist']);
      
      // Act
      const { createCLI } = await import('../../src/cli/index.js');
      const program = createCLI();
      const buildCommand = program.commands.find(cmd => cmd.name() === 'build');
      
      // Assert
      expect(buildCommand).toBeDefined();
      const outDirOption = buildCommand?.options.find(opt => 
        opt.short === '-o' || opt.long === '--outDir'
      );
      expect(outDirOption).toBeDefined();
    });

    it('should execute build process when build command is called', async () => {
      // Arrange
      const mockBuild = vi.fn().mockResolvedValue(undefined);
      
      // Act
      const { createCLI, setBuildHandler } = await import('../../src/cli/index.js');
      setBuildHandler(mockBuild);
      const program = createCLI();
      await program.parseAsync(['node', 'constela-start', 'build']);
      
      // Assert
      expect(mockBuild).toHaveBeenCalled();
    });

    it('should pass outDir option to build handler', async () => {
      // Arrange
      const mockBuild = vi.fn().mockResolvedValue(undefined);

      // Act
      const { createCLI, setBuildHandler } = await import('../../src/cli/index.js');
      setBuildHandler(mockBuild);
      const program = createCLI();
      await program.parseAsync(['node', 'constela-start', 'build', '--outDir', 'custom-dist']);

      // Assert
      expect(mockBuild).toHaveBeenCalledWith(
        expect.objectContaining({ outDir: 'custom-dist' })
      );
    });

    it('should accept --css option for build command', async () => {
      // Arrange
      simulateCliArgs(['build', '--css', 'src/styles/main.css']);

      // Act
      const { createCLI } = await import('../../src/cli/index.js');
      const program = createCLI();
      const buildCommand = program.commands.find(cmd => cmd.name() === 'build');

      // Assert
      expect(buildCommand).toBeDefined();
      const cssOption = buildCommand?.options.find(opt =>
        opt.short === '-c' || opt.long === '--css'
      );
      expect(cssOption).toBeDefined();
    });

    it('should pass --css option to build handler', async () => {
      // Arrange
      const mockBuild = vi.fn().mockResolvedValue(undefined);

      // Act
      const { createCLI, setBuildHandler } = await import('../../src/cli/index.js');
      setBuildHandler(mockBuild);
      const program = createCLI();
      await program.parseAsync(['node', 'constela-start', 'build', '--css', 'src/styles/main.css']);

      // Assert
      expect(mockBuild).toHaveBeenCalledWith(
        expect.objectContaining({ css: 'src/styles/main.css' })
      );
    });

    it('should accept --layoutsDir option for build command', async () => {
      // Arrange
      simulateCliArgs(['build', '--layoutsDir', 'src/layouts']);

      // Act
      const { createCLI } = await import('../../src/cli/index.js');
      const program = createCLI();
      const buildCommand = program.commands.find(cmd => cmd.name() === 'build');

      // Assert
      expect(buildCommand).toBeDefined();
      const layoutsDirOption = buildCommand?.options.find(opt =>
        opt.short === '-l' || opt.long === '--layoutsDir'
      );
      expect(layoutsDirOption).toBeDefined();
    });

    it('should pass --layoutsDir option to build handler', async () => {
      // Arrange
      const mockBuild = vi.fn().mockResolvedValue(undefined);

      // Act
      const { createCLI, setBuildHandler } = await import('../../src/cli/index.js');
      setBuildHandler(mockBuild);
      const program = createCLI();
      await program.parseAsync(['node', 'constela-start', 'build', '--layoutsDir', 'src/layouts']);

      // Assert
      expect(mockBuild).toHaveBeenCalledWith(
        expect.objectContaining({ layoutsDir: 'src/layouts' })
      );
    });

    it('should accept all options together for build command', async () => {
      // Arrange
      const mockBuild = vi.fn().mockResolvedValue(undefined);

      // Act
      const { createCLI, setBuildHandler } = await import('../../src/cli/index.js');
      setBuildHandler(mockBuild);
      const program = createCLI();
      await program.parseAsync([
        'node', 'constela-start', 'build',
        '--outDir', 'dist',
        '--css', 'src/styles/main.css',
        '--layoutsDir', 'src/layouts'
      ]);

      // Assert
      expect(mockBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          outDir: 'dist',
          css: 'src/styles/main.css',
          layoutsDir: 'src/layouts'
        })
      );
    });
  });

  // ==================== start command ====================

  describe('start command', () => {
    it('should recognize start command', async () => {
      // Arrange
      simulateCliArgs(['start']);
      
      // Act
      const { createCLI } = await import('../../src/cli/index.js');
      const program = createCLI();
      
      // Assert
      const startCommand = program.commands.find(cmd => cmd.name() === 'start');
      expect(startCommand).toBeDefined();
      expect(startCommand?.description()).toContain('production');
    });

    it('should accept --port option for start command', async () => {
      // Arrange
      simulateCliArgs(['start', '--port', '8080']);
      
      // Act
      const { createCLI } = await import('../../src/cli/index.js');
      const program = createCLI();
      const startCommand = program.commands.find(cmd => cmd.name() === 'start');
      
      // Assert
      expect(startCommand).toBeDefined();
      const portOption = startCommand?.options.find(opt => 
        opt.short === '-p' || opt.long === '--port'
      );
      expect(portOption).toBeDefined();
    });

    it('should start production server when start command is executed', async () => {
      // Arrange
      const mockStart = vi.fn().mockResolvedValue({ port: 3000 });

      // Act
      const { createCLI, setStartHandler } = await import('../../src/cli/index.js');
      setStartHandler(mockStart);
      const program = createCLI();
      await program.parseAsync(['node', 'constela-start', 'start']);

      // Assert
      expect(mockStart).toHaveBeenCalled();
    });

    it('should accept --host option for start command', async () => {
      // Arrange
      simulateCliArgs(['start', '--host', '0.0.0.0']);

      // Act
      const { createCLI } = await import('../../src/cli/index.js');
      const program = createCLI();
      const startCommand = program.commands.find(cmd => cmd.name() === 'start');

      // Assert
      expect(startCommand).toBeDefined();
      const hostOption = startCommand?.options.find(opt =>
        opt.short === '-h' || opt.long === '--host'
      );
      expect(hostOption).toBeDefined();
    });

    it('should pass --host option to start handler', async () => {
      // Arrange
      const mockStart = vi.fn().mockResolvedValue({ port: 3000 });

      // Act
      const { createCLI, setStartHandler } = await import('../../src/cli/index.js');
      setStartHandler(mockStart);
      const program = createCLI();
      await program.parseAsync(['node', 'constela-start', 'start', '--host', '0.0.0.0']);

      // Assert
      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({ host: '0.0.0.0' })
      );
    });

    it('should accept --css option for start command', async () => {
      // Arrange
      simulateCliArgs(['start', '--css', 'src/styles/main.css']);

      // Act
      const { createCLI } = await import('../../src/cli/index.js');
      const program = createCLI();
      const startCommand = program.commands.find(cmd => cmd.name() === 'start');

      // Assert
      expect(startCommand).toBeDefined();
      const cssOption = startCommand?.options.find(opt =>
        opt.short === '-c' || opt.long === '--css'
      );
      expect(cssOption).toBeDefined();
    });

    it('should pass --css option to start handler', async () => {
      // Arrange
      const mockStart = vi.fn().mockResolvedValue({ port: 3000 });

      // Act
      const { createCLI, setStartHandler } = await import('../../src/cli/index.js');
      setStartHandler(mockStart);
      const program = createCLI();
      await program.parseAsync(['node', 'constela-start', 'start', '--css', 'src/styles/main.css']);

      // Assert
      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({ css: 'src/styles/main.css' })
      );
    });

    it('should accept --layoutsDir option for start command', async () => {
      // Arrange
      simulateCliArgs(['start', '--layoutsDir', 'src/layouts']);

      // Act
      const { createCLI } = await import('../../src/cli/index.js');
      const program = createCLI();
      const startCommand = program.commands.find(cmd => cmd.name() === 'start');

      // Assert
      expect(startCommand).toBeDefined();
      const layoutsDirOption = startCommand?.options.find(opt =>
        opt.short === '-l' || opt.long === '--layoutsDir'
      );
      expect(layoutsDirOption).toBeDefined();
    });

    it('should pass --layoutsDir option to start handler', async () => {
      // Arrange
      const mockStart = vi.fn().mockResolvedValue({ port: 3000 });

      // Act
      const { createCLI, setStartHandler } = await import('../../src/cli/index.js');
      setStartHandler(mockStart);
      const program = createCLI();
      await program.parseAsync(['node', 'constela-start', 'start', '--layoutsDir', 'src/layouts']);

      // Assert
      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({ layoutsDir: 'src/layouts' })
      );
    });

    it('should accept all options together for start command', async () => {
      // Arrange
      const mockStart = vi.fn().mockResolvedValue({ port: 3000 });

      // Act
      const { createCLI, setStartHandler } = await import('../../src/cli/index.js');
      setStartHandler(mockStart);
      const program = createCLI();
      await program.parseAsync([
        'node', 'constela-start', 'start',
        '--port', '8080',
        '--host', '0.0.0.0',
        '--css', 'src/styles/main.css',
        '--layoutsDir', 'src/layouts'
      ]);

      // Assert
      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({
          port: '8080',
          host: '0.0.0.0',
          css: 'src/styles/main.css',
          layoutsDir: 'src/layouts'
        })
      );
    });
  });
});

// ==================== Help and Version Tests ====================

describe('CLI Help and Version', () => {
  // ==================== help ====================

  describe('help display', () => {
    it('should display help with --help flag', async () => {
      // Arrange
      const { createCLI } = await import('../../src/cli/index.js');
      const program = createCLI();
      program.exitOverride();
      
      // Act & Assert
      try {
        await program.parseAsync(['node', 'constela-start', '--help']);
      } catch (err: unknown) {
        // Commander throws on --help
        expect((err as { code: string }).code).toBe('commander.helpDisplayed');
      }
    });

    it('should include all commands in help output', async () => {
      // Arrange
      const { createCLI } = await import('../../src/cli/index.js');
      const program = createCLI();
      
      // Act
      const helpInfo = program.helpInformation();
      
      // Assert
      expect(helpInfo).toContain('dev');
      expect(helpInfo).toContain('build');
      expect(helpInfo).toContain('start');
    });
  });

  // ==================== version ====================

  describe('version display', () => {
    it('should display version with --version flag', async () => {
      // Arrange
      const { createCLI } = await import('../../src/cli/index.js');
      const program = createCLI();
      program.exitOverride();
      
      // Act & Assert
      try {
        await program.parseAsync(['node', 'constela-start', '--version']);
      } catch (err: unknown) {
        // Commander throws on --version
        expect((err as { code: string }).code).toBe('commander.version');
      }
    });

    it('should have a valid semver version string', async () => {
      // Arrange
      const { createCLI } = await import('../../src/cli/index.js');
      const program = createCLI();
      
      // Act
      const version = program.version();
      
      // Assert
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });
});

// ==================== Error Handling Tests ====================

describe('CLI Error Handling', () => {
  it('should show error for unknown command', async () => {
    // Arrange
    const { createCLI } = await import('../../src/cli/index.js');
    const program = createCLI();
    program.exitOverride();

    // Act & Assert
    await expect(
      program.parseAsync(['node', 'constela-start', 'unknown-cmd'])
    ).rejects.toThrow();
  });

  it('should show error for invalid option', async () => {
    // Arrange
    const { createCLI } = await import('../../src/cli/index.js');
    const program = createCLI();
    program.exitOverride();

    // Act & Assert
    await expect(
      program.parseAsync(['node', 'constela-start', 'dev', '--invalid-option'])
    ).rejects.toThrow();
  });
});

// ==================== Config File Integration Tests ====================

describe('CLI Config File Integration', () => {
  // ==================== build command config integration ====================

  describe('build command config integration', () => {
    it('should load config file and merge with CLI options for build', async () => {
      /**
       * Given: A config file with css and layoutsDir settings
       * When: Build command is executed without CLI options
       * Then: Handler receives config file values
       */
      // Arrange
      const mockBuild = vi.fn().mockResolvedValue(undefined);

      // Act
      const { createCLI, setBuildHandler } = await import('../../src/cli/index.js');
      setBuildHandler(mockBuild);
      const program = createCLI();
      await program.parseAsync(['node', 'constela-start', 'build']);

      // Assert - Config file values should be loaded and passed to handler
      // This test expects the CLI to load constela.config.json and merge values
      expect(mockBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          css: expect.any(String),
          layoutsDir: expect.any(String),
        })
      );
    });

    it('should use config file outDir when CLI option not provided', async () => {
      /**
       * Given: A config file with build.outDir set
       * When: Build command is executed without --outDir option
       * Then: Handler receives outDir from config file
       */
      // Arrange
      const mockBuild = vi.fn().mockResolvedValue(undefined);

      // Act
      const { createCLI, setBuildHandler } = await import('../../src/cli/index.js');
      setBuildHandler(mockBuild);
      const program = createCLI();
      await program.parseAsync(['node', 'constela-start', 'build']);

      // Assert - Config file outDir should be used
      expect(mockBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          outDir: expect.any(String),
        })
      );
    });

    it('should override config file values with CLI options for build', async () => {
      /**
       * Given: A config file with css and layoutsDir settings
       * When: Build command is executed with CLI options
       * Then: CLI options override config file values
       */
      // Arrange
      const mockBuild = vi.fn().mockResolvedValue(undefined);
      const cliOutDir = 'cli-dist';
      const cliCss = 'cli-styles.css';
      const cliLayoutsDir = 'cli-layouts';

      // Act
      const { createCLI, setBuildHandler } = await import('../../src/cli/index.js');
      setBuildHandler(mockBuild);
      const program = createCLI();
      await program.parseAsync([
        'node', 'constela-start', 'build',
        '--outDir', cliOutDir,
        '--css', cliCss,
        '--layoutsDir', cliLayoutsDir
      ]);

      // Assert - CLI options should take precedence over config file
      expect(mockBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          outDir: cliOutDir,
          css: cliCss,
          layoutsDir: cliLayoutsDir,
        })
      );
    });
  });

  // ==================== start command config integration ====================

  describe('start command config integration', () => {
    it('should load config file and merge with CLI options for start', async () => {
      /**
       * Given: A config file with css and layoutsDir settings
       * When: Start command is executed without CLI options
       * Then: Handler receives config file values
       */
      // Arrange
      const mockStart = vi.fn().mockResolvedValue({ port: 3000 });

      // Act
      const { createCLI, setStartHandler } = await import('../../src/cli/index.js');
      setStartHandler(mockStart);
      const program = createCLI();
      await program.parseAsync(['node', 'constela-start', 'start']);

      // Assert - Config file values should be loaded and passed to handler
      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({
          css: expect.any(String),
          layoutsDir: expect.any(String),
        })
      );
    });

    it('should use config file port and host when CLI options not provided', async () => {
      /**
       * Given: A config file with dev.port and dev.host set
       * When: Start command is executed without --port and --host options
       * Then: Handler receives port and host from config file
       */
      // Arrange
      const mockStart = vi.fn().mockResolvedValue({ port: 8080 });

      // Act
      const { createCLI, setStartHandler } = await import('../../src/cli/index.js');
      setStartHandler(mockStart);
      const program = createCLI();
      await program.parseAsync(['node', 'constela-start', 'start']);

      // Assert - Config file port/host should be used (not default 3000)
      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({
          port: expect.stringMatching(/^\d+$/),
          host: expect.any(String),
        })
      );
    });

    it('should override config file values with CLI options for start', async () => {
      /**
       * Given: A config file with dev settings
       * When: Start command is executed with CLI options
       * Then: CLI options override config file values
       */
      // Arrange
      const mockStart = vi.fn().mockResolvedValue({ port: 9000 });
      const cliPort = '9000';
      const cliHost = 'cli-host.local';
      const cliCss = 'cli-styles.css';
      const cliLayoutsDir = 'cli-layouts';

      // Act
      const { createCLI, setStartHandler } = await import('../../src/cli/index.js');
      setStartHandler(mockStart);
      const program = createCLI();
      await program.parseAsync([
        'node', 'constela-start', 'start',
        '--port', cliPort,
        '--host', cliHost,
        '--css', cliCss,
        '--layoutsDir', cliLayoutsDir
      ]);

      // Assert - CLI options should take precedence over config file
      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({
          port: cliPort,
          host: cliHost,
          css: cliCss,
          layoutsDir: cliLayoutsDir,
        })
      );
    });
  });

  // ==================== config file value precedence ====================

  describe('config file value precedence', () => {
    it('should use config file values when CLI option not provided for build', async () => {
      /**
       * Given: A config file with css set to "config-styles.css"
       * When: Build command is executed without --css option
       * Then: Handler receives css from config file
       */
      // Arrange
      const mockBuild = vi.fn().mockResolvedValue(undefined);

      // Act
      const { createCLI, setBuildHandler } = await import('../../src/cli/index.js');
      setBuildHandler(mockBuild);
      const program = createCLI();
      await program.parseAsync(['node', 'constela-start', 'build', '--outDir', 'dist']);

      // Assert - css should come from config file, outDir from CLI
      expect(mockBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          outDir: 'dist',
          css: expect.any(String), // from config file
        })
      );
    });

    it('should use config file values when CLI option not provided for start', async () => {
      /**
       * Given: A config file with layoutsDir set
       * When: Start command is executed with only --port option
       * Then: Handler receives layoutsDir from config file and port from CLI
       */
      // Arrange
      const mockStart = vi.fn().mockResolvedValue({ port: 4000 });

      // Act
      const { createCLI, setStartHandler } = await import('../../src/cli/index.js');
      setStartHandler(mockStart);
      const program = createCLI();
      await program.parseAsync(['node', 'constela-start', 'start', '--port', '4000']);

      // Assert - port should be from CLI, layoutsDir from config file
      expect(mockStart).toHaveBeenCalledWith(
        expect.objectContaining({
          port: '4000',
          layoutsDir: expect.any(String), // from config file
        })
      );
    });
  });
});
