/**
 * Test module for create-constela helper modules.
 *
 * Coverage:
 * - git.ts: Git repository initialization
 * - install.ts: Package dependency installation
 * - package-manager.ts: Package manager detection
 *
 * TDD Red Phase: These tests should FAIL until implementation exists.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';

// Mock the modules
vi.mock('node:child_process');
vi.mock('node:fs');

// Import the modules under test (will fail until implemented)
import { initGit } from '../src/helpers/git.js';
import { installDependencies } from '../src/helpers/install.js';
import { detectPackageManager } from '../src/helpers/package-manager.js';

// ==================== Test Fixtures ====================

const PROJECT_PATH = '/mock/projects/my-app';

/**
 * Helper to create a mock for execSync success
 */
function mockExecSyncSuccess(): void {
  vi.mocked(childProcess.execSync).mockReturnValue(Buffer.from(''));
}

/**
 * Helper to create a mock for execSync failure
 */
function mockExecSyncFailure(errorMessage: string): void {
  vi.mocked(childProcess.execSync).mockImplementation(() => {
    throw new Error(errorMessage);
  });
}

// ==================== git.ts Tests ====================

describe('initGit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Happy Path ====================

  describe('when git is available', () => {
    it('should call git init with correct cwd option', async () => {
      /**
       * Given: A valid project path
       * When: initGit is called
       * Then: git init should be executed with the correct cwd
       */
      // Arrange
      mockExecSyncSuccess();

      // Act
      await initGit(PROJECT_PATH);

      // Assert
      expect(childProcess.execSync).toHaveBeenCalledWith(
        'git init',
        expect.objectContaining({ cwd: PROJECT_PATH })
      );
    });

    it('should return true on successful initialization', async () => {
      /**
       * Given: git init succeeds
       * When: initGit is called
       * Then: it should return true
       */
      // Arrange
      mockExecSyncSuccess();

      // Act
      const result = await initGit(PROJECT_PATH);

      // Assert
      expect(result).toBe(true);
    });

    it('should use stdio: ignore to suppress output', async () => {
      /**
       * Given: A valid project path
       * When: initGit is called
       * Then: stdio should be set to ignore
       */
      // Arrange
      mockExecSyncSuccess();

      // Act
      await initGit(PROJECT_PATH);

      // Assert
      expect(childProcess.execSync).toHaveBeenCalledWith(
        'git init',
        expect.objectContaining({ stdio: 'ignore' })
      );
    });
  });

  // ==================== Error Handling ====================

  describe('when git command fails', () => {
    it('should return false when git is not installed', async () => {
      /**
       * Given: git is not installed on the system
       * When: initGit is called
       * Then: it should return false
       */
      // Arrange
      mockExecSyncFailure('git: command not found');

      // Act
      const result = await initGit(PROJECT_PATH);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when directory is not writable', async () => {
      /**
       * Given: The project directory is not writable
       * When: initGit is called
       * Then: it should return false
       */
      // Arrange
      mockExecSyncFailure('fatal: cannot mkdir .git');

      // Act
      const result = await initGit(PROJECT_PATH);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when already in a git repository', async () => {
      /**
       * Given: The directory is already inside a git repository
       * When: initGit is called
       * Then: it should return false (or handle gracefully)
       */
      // Arrange
      mockExecSyncFailure('Reinitialized existing Git repository');

      // Act
      const result = await initGit(PROJECT_PATH);

      // Assert
      expect(result).toBe(false);
    });

    it('should not throw error to caller when git fails', async () => {
      /**
       * Given: git init fails for any reason
       * When: initGit is called
       * Then: it should not throw, just return false
       */
      // Arrange
      mockExecSyncFailure('some git error');

      // Act & Assert
      await expect(initGit(PROJECT_PATH)).resolves.toBe(false);
    });
  });
});

// ==================== install.ts Tests ====================

describe('installDependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== npm ====================

  describe('when using npm', () => {
    it('should run npm install command', async () => {
      /**
       * Given: npm is the selected package manager
       * When: installDependencies is called
       * Then: npm install should be executed
       */
      // Arrange
      mockExecSyncSuccess();

      // Act
      await installDependencies(PROJECT_PATH, 'npm');

      // Assert
      expect(childProcess.execSync).toHaveBeenCalledWith(
        'npm install',
        expect.objectContaining({ cwd: PROJECT_PATH })
      );
    });

    it('should return true on successful npm install', async () => {
      /**
       * Given: npm install succeeds
       * When: installDependencies is called with npm
       * Then: it should return true
       */
      // Arrange
      mockExecSyncSuccess();

      // Act
      const result = await installDependencies(PROJECT_PATH, 'npm');

      // Assert
      expect(result).toBe(true);
    });
  });

  // ==================== yarn ====================

  describe('when using yarn', () => {
    it('should run yarn command (not yarn install)', async () => {
      /**
       * Given: yarn is the selected package manager
       * When: installDependencies is called
       * Then: yarn should be executed (without install subcommand)
       */
      // Arrange
      mockExecSyncSuccess();

      // Act
      await installDependencies(PROJECT_PATH, 'yarn');

      // Assert
      expect(childProcess.execSync).toHaveBeenCalledWith(
        'yarn',
        expect.objectContaining({ cwd: PROJECT_PATH })
      );
    });

    it('should return true on successful yarn install', async () => {
      /**
       * Given: yarn succeeds
       * When: installDependencies is called with yarn
       * Then: it should return true
       */
      // Arrange
      mockExecSyncSuccess();

      // Act
      const result = await installDependencies(PROJECT_PATH, 'yarn');

      // Assert
      expect(result).toBe(true);
    });
  });

  // ==================== pnpm ====================

  describe('when using pnpm', () => {
    it('should run pnpm install command', async () => {
      /**
       * Given: pnpm is the selected package manager
       * When: installDependencies is called
       * Then: pnpm install should be executed
       */
      // Arrange
      mockExecSyncSuccess();

      // Act
      await installDependencies(PROJECT_PATH, 'pnpm');

      // Assert
      expect(childProcess.execSync).toHaveBeenCalledWith(
        'pnpm install',
        expect.objectContaining({ cwd: PROJECT_PATH })
      );
    });

    it('should return true on successful pnpm install', async () => {
      /**
       * Given: pnpm install succeeds
       * When: installDependencies is called with pnpm
       * Then: it should return true
       */
      // Arrange
      mockExecSyncSuccess();

      // Act
      const result = await installDependencies(PROJECT_PATH, 'pnpm');

      // Assert
      expect(result).toBe(true);
    });
  });

  // ==================== Common Options ====================

  describe('common execution options', () => {
    it('should use stdio: inherit to show installation progress', async () => {
      /**
       * Given: Any package manager
       * When: installDependencies is called
       * Then: stdio should be set to inherit for user feedback
       */
      // Arrange
      mockExecSyncSuccess();

      // Act
      await installDependencies(PROJECT_PATH, 'npm');

      // Assert
      expect(childProcess.execSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ stdio: 'inherit' })
      );
    });

    it('should execute in the correct project directory', async () => {
      /**
       * Given: A project path
       * When: installDependencies is called
       * Then: cwd should be set to the project path
       */
      // Arrange
      mockExecSyncSuccess();

      // Act
      await installDependencies('/custom/path', 'npm');

      // Assert
      expect(childProcess.execSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ cwd: '/custom/path' })
      );
    });
  });

  // ==================== Error Handling ====================

  describe('when installation fails', () => {
    it('should return false when package manager is not installed', async () => {
      /**
       * Given: The package manager is not installed
       * When: installDependencies is called
       * Then: it should return false
       */
      // Arrange
      mockExecSyncFailure('pnpm: command not found');

      // Act
      const result = await installDependencies(PROJECT_PATH, 'pnpm');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when dependencies fail to install', async () => {
      /**
       * Given: npm install fails due to network error
       * When: installDependencies is called
       * Then: it should return false
       */
      // Arrange
      mockExecSyncFailure('npm ERR! network error');

      // Act
      const result = await installDependencies(PROJECT_PATH, 'npm');

      // Assert
      expect(result).toBe(false);
    });

    it('should not throw error to caller when install fails', async () => {
      /**
       * Given: Installation fails for any reason
       * When: installDependencies is called
       * Then: it should not throw, just return false
       */
      // Arrange
      mockExecSyncFailure('some installation error');

      // Act & Assert
      await expect(installDependencies(PROJECT_PATH, 'npm')).resolves.toBe(false);
    });
  });
});

// ==================== package-manager.ts Tests ====================

describe('detectPackageManager', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    process.env = { ...originalEnv };
    delete process.env.npm_config_user_agent;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  // ==================== Lock File Detection ====================

  describe('when detecting from lock files', () => {
    it('should return pnpm when pnpm-lock.yaml exists', () => {
      /**
       * Given: pnpm-lock.yaml exists in the current directory
       * When: detectPackageManager is called
       * Then: it should return 'pnpm'
       */
      // Arrange
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return String(filePath).includes('pnpm-lock.yaml');
      });

      // Act
      const result = detectPackageManager();

      // Assert
      expect(result).toBe('pnpm');
    });

    it('should return yarn when yarn.lock exists', () => {
      /**
       * Given: yarn.lock exists in the current directory
       * When: detectPackageManager is called
       * Then: it should return 'yarn'
       */
      // Arrange
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return String(filePath).includes('yarn.lock');
      });

      // Act
      const result = detectPackageManager();

      // Assert
      expect(result).toBe('yarn');
    });

    it('should return npm when package-lock.json exists', () => {
      /**
       * Given: package-lock.json exists in the current directory
       * When: detectPackageManager is called
       * Then: it should return 'npm'
       */
      // Arrange
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return String(filePath).includes('package-lock.json');
      });

      // Act
      const result = detectPackageManager();

      // Assert
      expect(result).toBe('npm');
    });

    it('should prioritize pnpm-lock.yaml over other lock files', () => {
      /**
       * Given: Multiple lock files exist (pnpm-lock.yaml, yarn.lock, package-lock.json)
       * When: detectPackageManager is called
       * Then: it should return 'pnpm' (highest priority)
       */
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Act
      const result = detectPackageManager();

      // Assert
      expect(result).toBe('pnpm');
    });

    it('should prioritize yarn.lock over package-lock.json', () => {
      /**
       * Given: yarn.lock and package-lock.json both exist
       * When: detectPackageManager is called
       * Then: it should return 'yarn'
       */
      // Arrange
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        const path = String(filePath);
        return path.includes('yarn.lock') || path.includes('package-lock.json');
      });

      // Act
      const result = detectPackageManager();

      // Assert
      expect(result).toBe('yarn');
    });
  });

  // ==================== npm_config_user_agent Detection ====================

  describe('when detecting from npm_config_user_agent', () => {
    it('should return pnpm when npm_config_user_agent contains pnpm', () => {
      /**
       * Given: npm_config_user_agent indicates pnpm
       * When: detectPackageManager is called
       * Then: it should return 'pnpm'
       */
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false);
      process.env.npm_config_user_agent = 'pnpm/8.0.0 npm/? node/v18.0.0';

      // Act
      const result = detectPackageManager();

      // Assert
      expect(result).toBe('pnpm');
    });

    it('should return yarn when npm_config_user_agent contains yarn', () => {
      /**
       * Given: npm_config_user_agent indicates yarn
       * When: detectPackageManager is called
       * Then: it should return 'yarn'
       */
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false);
      process.env.npm_config_user_agent = 'yarn/1.22.0 npm/? node/v18.0.0';

      // Act
      const result = detectPackageManager();

      // Assert
      expect(result).toBe('yarn');
    });

    it('should return npm when npm_config_user_agent contains npm only', () => {
      /**
       * Given: npm_config_user_agent indicates npm
       * When: detectPackageManager is called
       * Then: it should return 'npm'
       */
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false);
      process.env.npm_config_user_agent = 'npm/9.0.0 node/v18.0.0';

      // Act
      const result = detectPackageManager();

      // Assert
      expect(result).toBe('npm');
    });

    it('should prioritize lock files over npm_config_user_agent', () => {
      /**
       * Given: yarn.lock exists but npm_config_user_agent says pnpm
       * When: detectPackageManager is called
       * Then: it should return 'yarn' (lock file takes priority)
       */
      // Arrange
      vi.mocked(fs.existsSync).mockImplementation((filePath) => {
        return String(filePath).includes('yarn.lock');
      });
      process.env.npm_config_user_agent = 'pnpm/8.0.0';

      // Act
      const result = detectPackageManager();

      // Assert
      expect(result).toBe('yarn');
    });
  });

  // ==================== Default Behavior ====================

  describe('when nothing is detected', () => {
    it('should default to npm when no lock files exist and no user agent', () => {
      /**
       * Given: No lock files exist and npm_config_user_agent is not set
       * When: detectPackageManager is called
       * Then: it should return 'npm' as default
       */
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false);
      delete process.env.npm_config_user_agent;

      // Act
      const result = detectPackageManager();

      // Assert
      expect(result).toBe('npm');
    });

    it('should default to npm when npm_config_user_agent is empty', () => {
      /**
       * Given: npm_config_user_agent is empty string
       * When: detectPackageManager is called
       * Then: it should return 'npm' as default
       */
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false);
      process.env.npm_config_user_agent = '';

      // Act
      const result = detectPackageManager();

      // Assert
      expect(result).toBe('npm');
    });

    it('should default to npm when npm_config_user_agent is unrecognized', () => {
      /**
       * Given: npm_config_user_agent contains unrecognized package manager
       * When: detectPackageManager is called
       * Then: it should return 'npm' as default
       */
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false);
      process.env.npm_config_user_agent = 'unknown-pm/1.0.0';

      // Act
      const result = detectPackageManager();

      // Assert
      expect(result).toBe('npm');
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle fs.existsSync throwing an error', () => {
      /**
       * Given: fs.existsSync throws an error
       * When: detectPackageManager is called
       * Then: it should fallback to npm without crashing
       */
      // Arrange
      vi.mocked(fs.existsSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      // Act
      const result = detectPackageManager();

      // Assert
      expect(result).toBe('npm');
    });

    it('should be case-insensitive when parsing npm_config_user_agent', () => {
      /**
       * Given: npm_config_user_agent has unusual casing
       * When: detectPackageManager is called
       * Then: it should still detect the package manager
       */
      // Arrange
      vi.mocked(fs.existsSync).mockReturnValue(false);
      process.env.npm_config_user_agent = 'PNPM/8.0.0';

      // Act
      const result = detectPackageManager();

      // Assert
      expect(result).toBe('pnpm');
    });
  });
});
