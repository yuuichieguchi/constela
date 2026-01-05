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
