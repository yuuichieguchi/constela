/**
 * Test module for Browser Actions types.
 *
 * Coverage:
 * - StorageStep type structure
 * - ClipboardStep type structure
 * - NavigateStep type structure
 * - Type guards: isStorageStep, isClipboardStep, isNavigateStep
 * - ActionStep union includes new browser action types
 *
 * TDD Red Phase: These tests verify the browser action types
 * that will be added to support browser APIs in Constela DSL.
 */

import { describe, it, expect } from 'vitest';

import type {
  StorageStep,
  ClipboardStep,
  NavigateStep,
  ActionStep,
} from '../ast.js';
import {
  isStorageStep,
  isClipboardStep,
  isNavigateStep,
  isActionStep,
} from '../guards.js';

describe('StorageStep', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    it('should have do field set to "storage"', () => {
      // Arrange
      const step = {
        do: 'storage',
        operation: 'get',
        key: { expr: 'lit', value: 'myKey' },
        storage: 'local',
      };

      // Assert
      expect(isStorageStep(step)).toBe(true);
    });

    it('should require operation field (get, set, remove)', () => {
      // Arrange
      const getStep = {
        do: 'storage',
        operation: 'get',
        key: { expr: 'lit', value: 'key' },
        storage: 'local',
        result: 'value',
      };

      const setStep = {
        do: 'storage',
        operation: 'set',
        key: { expr: 'lit', value: 'key' },
        value: { expr: 'lit', value: 'data' },
        storage: 'local',
      };

      const removeStep = {
        do: 'storage',
        operation: 'remove',
        key: { expr: 'lit', value: 'key' },
        storage: 'session',
      };

      // Assert
      expect(isStorageStep(getStep)).toBe(true);
      expect(isStorageStep(setStep)).toBe(true);
      expect(isStorageStep(removeStep)).toBe(true);
    });

    it('should require key field as Expression', () => {
      // Arrange
      const validStep = {
        do: 'storage',
        operation: 'get',
        key: { expr: 'lit', value: 'myKey' },
        storage: 'local',
      };

      const invalidStep = {
        do: 'storage',
        operation: 'get',
        // Missing key field
        storage: 'local',
      };

      // Assert
      expect(isStorageStep(validStep)).toBe(true);
      expect(isStorageStep(invalidStep)).toBe(false);
    });

    it('should require storage field (local or session)', () => {
      // Arrange
      const localStep = {
        do: 'storage',
        operation: 'get',
        key: { expr: 'lit', value: 'key' },
        storage: 'local',
      };

      const sessionStep = {
        do: 'storage',
        operation: 'get',
        key: { expr: 'lit', value: 'key' },
        storage: 'session',
      };

      const invalidStorage = {
        do: 'storage',
        operation: 'get',
        key: { expr: 'lit', value: 'key' },
        storage: 'invalid',
      };

      // Assert
      expect(isStorageStep(localStep)).toBe(true);
      expect(isStorageStep(sessionStep)).toBe(true);
      expect(isStorageStep(invalidStorage)).toBe(false);
    });

    it('should require value field for set operation', () => {
      // Arrange
      const validSetStep = {
        do: 'storage',
        operation: 'set',
        key: { expr: 'lit', value: 'key' },
        value: { expr: 'lit', value: 'myValue' },
        storage: 'local',
      };

      // Assert
      expect(isStorageStep(validSetStep)).toBe(true);
    });

    it('should accept optional result field for get operation', () => {
      // Arrange
      const stepWithResult = {
        do: 'storage',
        operation: 'get',
        key: { expr: 'lit', value: 'key' },
        storage: 'local',
        result: 'storedValue',
      };

      // Assert
      expect(isStorageStep(stepWithResult)).toBe(true);
    });

    it('should accept optional onSuccess and onError callbacks', () => {
      // Arrange
      const stepWithCallbacks = {
        do: 'storage',
        operation: 'get',
        key: { expr: 'lit', value: 'key' },
        storage: 'local',
        result: 'value',
        onSuccess: [
          { do: 'set', target: 'loaded', value: { expr: 'lit', value: true } },
        ],
        onError: [
          { do: 'set', target: 'error', value: { expr: 'lit', value: 'Failed' } },
        ],
      };

      // Assert
      expect(isStorageStep(stepWithCallbacks)).toBe(true);
    });

    it('should accept dynamic key from state expression', () => {
      // Arrange
      const stepWithStateKey = {
        do: 'storage',
        operation: 'get',
        key: { expr: 'state', name: 'currentKey' },
        storage: 'local',
        result: 'value',
      };

      // Assert
      expect(isStorageStep(stepWithStateKey)).toBe(true);
    });

    it('should accept dynamic key from binary expression', () => {
      // Arrange
      const stepWithBinKey = {
        do: 'storage',
        operation: 'get',
        key: {
          expr: 'bin',
          op: '+',
          left: { expr: 'lit', value: 'user_' },
          right: { expr: 'state', name: 'userId' },
        },
        storage: 'local',
        result: 'userData',
      };

      // Assert
      expect(isStorageStep(stepWithBinKey)).toBe(true);
    });
  });

  // ==================== Type Guard Edge Cases ====================

  describe('type guard edge cases', () => {
    it('should reject null', () => {
      expect(isStorageStep(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isStorageStep(undefined)).toBe(false);
    });

    it('should reject empty object', () => {
      expect(isStorageStep({})).toBe(false);
    });

    it('should reject object with wrong do field', () => {
      const obj = {
        do: 'set',
        target: 'foo',
        value: { expr: 'lit', value: 'bar' },
      };
      expect(isStorageStep(obj)).toBe(false);
    });

    it('should reject object with invalid operation', () => {
      const obj = {
        do: 'storage',
        operation: 'invalid',
        key: { expr: 'lit', value: 'key' },
        storage: 'local',
      };
      expect(isStorageStep(obj)).toBe(false);
    });

    it('should reject primitive values', () => {
      expect(isStorageStep('storage')).toBe(false);
      expect(isStorageStep(123)).toBe(false);
      expect(isStorageStep(true)).toBe(false);
    });
  });
});

describe('ClipboardStep', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    it('should have do field set to "clipboard"', () => {
      // Arrange
      const step = {
        do: 'clipboard',
        operation: 'write',
        value: { expr: 'lit', value: 'text to copy' },
      };

      // Assert
      expect(isClipboardStep(step)).toBe(true);
    });

    it('should require operation field (write or read)', () => {
      // Arrange
      const writeStep = {
        do: 'clipboard',
        operation: 'write',
        value: { expr: 'lit', value: 'copied text' },
      };

      const readStep = {
        do: 'clipboard',
        operation: 'read',
        result: 'clipboardContent',
      };

      // Assert
      expect(isClipboardStep(writeStep)).toBe(true);
      expect(isClipboardStep(readStep)).toBe(true);
    });

    it('should require value field for write operation', () => {
      // Arrange
      const validWriteStep = {
        do: 'clipboard',
        operation: 'write',
        value: { expr: 'lit', value: 'text' },
      };

      // Assert
      expect(isClipboardStep(validWriteStep)).toBe(true);
    });

    it('should accept optional result field for read operation', () => {
      // Arrange
      const readStepWithResult = {
        do: 'clipboard',
        operation: 'read',
        result: 'pastedText',
      };

      // Assert
      expect(isClipboardStep(readStepWithResult)).toBe(true);
    });

    it('should accept optional onSuccess and onError callbacks', () => {
      // Arrange
      const stepWithCallbacks = {
        do: 'clipboard',
        operation: 'write',
        value: { expr: 'state', name: 'textToCopy' },
        onSuccess: [
          { do: 'set', target: 'copied', value: { expr: 'lit', value: true } },
        ],
        onError: [
          { do: 'set', target: 'copyError', value: { expr: 'lit', value: 'Failed to copy' } },
        ],
      };

      // Assert
      expect(isClipboardStep(stepWithCallbacks)).toBe(true);
    });

    it('should accept value from state expression', () => {
      // Arrange
      const stepWithStateValue = {
        do: 'clipboard',
        operation: 'write',
        value: { expr: 'state', name: 'shareableLink' },
      };

      // Assert
      expect(isClipboardStep(stepWithStateValue)).toBe(true);
    });

    it('should accept value from binary expression', () => {
      // Arrange
      const stepWithBinValue = {
        do: 'clipboard',
        operation: 'write',
        value: {
          expr: 'bin',
          op: '+',
          left: { expr: 'lit', value: 'URL: ' },
          right: { expr: 'state', name: 'currentUrl' },
        },
      };

      // Assert
      expect(isClipboardStep(stepWithBinValue)).toBe(true);
    });
  });

  // ==================== Type Guard Edge Cases ====================

  describe('type guard edge cases', () => {
    it('should reject null', () => {
      expect(isClipboardStep(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isClipboardStep(undefined)).toBe(false);
    });

    it('should reject empty object', () => {
      expect(isClipboardStep({})).toBe(false);
    });

    it('should reject object with wrong do field', () => {
      const obj = {
        do: 'storage',
        operation: 'get',
        key: { expr: 'lit', value: 'key' },
        storage: 'local',
      };
      expect(isClipboardStep(obj)).toBe(false);
    });

    it('should reject object with invalid operation', () => {
      const obj = {
        do: 'clipboard',
        operation: 'copy', // Invalid: should be 'write' or 'read'
        value: { expr: 'lit', value: 'text' },
      };
      expect(isClipboardStep(obj)).toBe(false);
    });

    it('should reject primitive values', () => {
      expect(isClipboardStep('clipboard')).toBe(false);
      expect(isClipboardStep(123)).toBe(false);
      expect(isClipboardStep(true)).toBe(false);
    });
  });
});

describe('NavigateStep', () => {
  // ==================== Type Structure ====================

  describe('type structure', () => {
    it('should have do field set to "navigate"', () => {
      // Arrange
      const step = {
        do: 'navigate',
        url: { expr: 'lit', value: '/dashboard' },
      };

      // Assert
      expect(isNavigateStep(step)).toBe(true);
    });

    it('should require url field as Expression', () => {
      // Arrange
      const validStep = {
        do: 'navigate',
        url: { expr: 'lit', value: 'https://example.com' },
      };

      const invalidStep = {
        do: 'navigate',
        // Missing url field
      };

      // Assert
      expect(isNavigateStep(validStep)).toBe(true);
      expect(isNavigateStep(invalidStep)).toBe(false);
    });

    it('should accept optional target field (_self or _blank)', () => {
      // Arrange
      const selfTarget = {
        do: 'navigate',
        url: { expr: 'lit', value: '/page' },
        target: '_self',
      };

      const blankTarget = {
        do: 'navigate',
        url: { expr: 'lit', value: 'https://external.com' },
        target: '_blank',
      };

      // Assert
      expect(isNavigateStep(selfTarget)).toBe(true);
      expect(isNavigateStep(blankTarget)).toBe(true);
    });

    it('should accept optional replace field for history.replaceState', () => {
      // Arrange
      const stepWithReplace = {
        do: 'navigate',
        url: { expr: 'lit', value: '/new-page' },
        replace: true,
      };

      const stepWithoutReplace = {
        do: 'navigate',
        url: { expr: 'lit', value: '/other-page' },
        replace: false,
      };

      // Assert
      expect(isNavigateStep(stepWithReplace)).toBe(true);
      expect(isNavigateStep(stepWithoutReplace)).toBe(true);
    });

    it('should accept url from state expression', () => {
      // Arrange
      const stepWithStateUrl = {
        do: 'navigate',
        url: { expr: 'state', name: 'nextPage' },
      };

      // Assert
      expect(isNavigateStep(stepWithStateUrl)).toBe(true);
    });

    it('should accept url from binary expression', () => {
      // Arrange
      const stepWithBinUrl = {
        do: 'navigate',
        url: {
          expr: 'bin',
          op: '+',
          left: { expr: 'lit', value: '/users/' },
          right: { expr: 'state', name: 'userId' },
        },
      };

      // Assert
      expect(isNavigateStep(stepWithBinUrl)).toBe(true);
    });

    it('should reject invalid target values', () => {
      // Arrange
      const invalidTarget = {
        do: 'navigate',
        url: { expr: 'lit', value: '/page' },
        target: '_parent', // Invalid: only _self or _blank allowed
      };

      // Assert
      expect(isNavigateStep(invalidTarget)).toBe(false);
    });
  });

  // ==================== Type Guard Edge Cases ====================

  describe('type guard edge cases', () => {
    it('should reject null', () => {
      expect(isNavigateStep(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isNavigateStep(undefined)).toBe(false);
    });

    it('should reject empty object', () => {
      expect(isNavigateStep({})).toBe(false);
    });

    it('should reject object with wrong do field', () => {
      const obj = {
        do: 'fetch',
        url: { expr: 'lit', value: 'https://api.example.com' },
      };
      expect(isNavigateStep(obj)).toBe(false);
    });

    it('should reject primitive values', () => {
      expect(isNavigateStep('navigate')).toBe(false);
      expect(isNavigateStep(123)).toBe(false);
      expect(isNavigateStep(true)).toBe(false);
    });
  });
});

describe('ActionStep union with browser actions', () => {
  // ==================== ActionStep Union ====================

  describe('isActionStep includes browser action types', () => {
    it('should recognize StorageStep as valid ActionStep', () => {
      // Arrange
      const storageStep = {
        do: 'storage',
        operation: 'get',
        key: { expr: 'lit', value: 'key' },
        storage: 'local',
        result: 'value',
      };

      // Assert
      expect(isActionStep(storageStep)).toBe(true);
    });

    it('should recognize ClipboardStep as valid ActionStep', () => {
      // Arrange
      const clipboardStep = {
        do: 'clipboard',
        operation: 'write',
        value: { expr: 'lit', value: 'text' },
      };

      // Assert
      expect(isActionStep(clipboardStep)).toBe(true);
    });

    it('should recognize NavigateStep as valid ActionStep', () => {
      // Arrange
      const navigateStep = {
        do: 'navigate',
        url: { expr: 'lit', value: '/page' },
      };

      // Assert
      expect(isActionStep(navigateStep)).toBe(true);
    });

    it('should still recognize existing action step types', () => {
      // Arrange
      const setStep = {
        do: 'set',
        target: 'count',
        value: { expr: 'lit', value: 0 },
      };

      const updateStep = {
        do: 'update',
        target: 'count',
        operation: 'increment',
      };

      const fetchStep = {
        do: 'fetch',
        url: { expr: 'lit', value: 'https://api.example.com' },
      };

      // Assert
      expect(isActionStep(setStep)).toBe(true);
      expect(isActionStep(updateStep)).toBe(true);
      expect(isActionStep(fetchStep)).toBe(true);
    });
  });

  // ==================== TypeScript Type Compatibility ====================

  describe('TypeScript type compatibility', () => {
    it('should allow StorageStep in ActionStep array', () => {
      // This test verifies TypeScript compilation compatibility
      const steps: ActionStep[] = [
        {
          do: 'storage',
          operation: 'set',
          key: { expr: 'lit', value: 'token' },
          value: { expr: 'state', name: 'authToken' },
          storage: 'local',
        } as StorageStep,
      ];

      expect(steps.length).toBe(1);
    });

    it('should allow ClipboardStep in ActionStep array', () => {
      // This test verifies TypeScript compilation compatibility
      const steps: ActionStep[] = [
        {
          do: 'clipboard',
          operation: 'write',
          value: { expr: 'state', name: 'shareUrl' },
        } as ClipboardStep,
      ];

      expect(steps.length).toBe(1);
    });

    it('should allow NavigateStep in ActionStep array', () => {
      // This test verifies TypeScript compilation compatibility
      const steps: ActionStep[] = [
        {
          do: 'navigate',
          url: { expr: 'lit', value: '/home' },
        } as NavigateStep,
      ];

      expect(steps.length).toBe(1);
    });

    it('should allow mixed action steps including browser actions', () => {
      // This test verifies TypeScript compilation compatibility
      const steps: ActionStep[] = [
        {
          do: 'set',
          target: 'loading',
          value: { expr: 'lit', value: true },
        },
        {
          do: 'storage',
          operation: 'get',
          key: { expr: 'lit', value: 'cachedData' },
          storage: 'local',
          result: 'cached',
        } as StorageStep,
        {
          do: 'navigate',
          url: { expr: 'lit', value: '/result' },
        } as NavigateStep,
      ];

      expect(steps.length).toBe(3);
    });
  });
});
