/**
 * Test suite for validator.ts
 *
 * Coverage:
 * - validateDsl function
 * - validateNode function
 * - validateActions function
 * - ValidationContext interface
 * - DslValidationResult interface
 * - ValidationError type
 * - Security rule enforcement
 *
 * TDD Red Phase: These tests will FAIL until implementation exists
 */

import { describe, it, expect } from 'vitest';
import {
  validateDsl,
  validateNode,
  validateActions,
  type ValidationContext,
  type DslValidationResult,
  type ValidationError,
} from '../src/validator';

// ==================== validateDsl Function ====================

describe('validateDsl', () => {
  describe('valid DSL structures', () => {
    it('should return valid:true for DSL with safe tags', () => {
      const dsl = {
        type: 'view',
        children: [
          { type: 'text', props: { content: 'Hello' } },
          { type: 'button', props: { label: 'Click me' } },
        ],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid:true for empty DSL object', () => {
      const dsl = { type: 'view' };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid:true for DSL with allowed actions', () => {
      const dsl = {
        type: 'view',
        children: [
          {
            type: 'button',
            props: { label: 'Navigate' },
            actions: [{ type: 'navigate', payload: { path: '/home' } }],
          },
        ],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(true);
    });

    it('should return valid:true for deeply nested safe structure', () => {
      const dsl = {
        type: 'view',
        children: [
          {
            type: 'container',
            children: [
              {
                type: 'row',
                children: [
                  { type: 'text', props: { content: 'Deep' } },
                ],
              },
            ],
          },
        ],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(true);
    });
  });

  describe('forbidden tags detection', () => {
    it('should fail for DSL with <script> tag', () => {
      const dsl = {
        type: 'view',
        children: [
          { type: 'script', props: { src: 'malicious.js' } },
        ],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.toLowerCase().includes('script'))).toBe(true);
    });

    it('should fail for DSL with <iframe> tag', () => {
      const dsl = {
        type: 'view',
        children: [
          { type: 'iframe', props: { src: 'https://evil.com' } },
        ],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.toLowerCase().includes('iframe'))).toBe(true);
    });

    it('should fail for DSL with <object> tag', () => {
      const dsl = {
        type: 'view',
        children: [
          { type: 'object', props: { data: 'plugin.swf' } },
        ],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.toLowerCase().includes('object'))).toBe(true);
    });

    it('should fail for DSL with <embed> tag', () => {
      const dsl = {
        type: 'view',
        children: [
          { type: 'embed', props: { src: 'flash.swf' } },
        ],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.toLowerCase().includes('embed'))).toBe(true);
    });

    it('should fail for DSL with <form> tag', () => {
      const dsl = {
        type: 'view',
        children: [
          { type: 'form', props: { action: '/submit' } },
        ],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.toLowerCase().includes('form'))).toBe(true);
    });

    it('should detect deeply nested forbidden tag', () => {
      const dsl = {
        type: 'view',
        children: [
          {
            type: 'container',
            children: [
              {
                type: 'row',
                children: [
                  {
                    type: 'column',
                    children: [
                      { type: 'script', props: { src: 'deep.js' } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.toLowerCase().includes('script'))).toBe(true);
    });

    it('should detect multiple forbidden tags', () => {
      const dsl = {
        type: 'view',
        children: [
          { type: 'script', props: {} },
          { type: 'iframe', props: {} },
          { type: 'embed', props: {} },
        ],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('forbidden actions detection', () => {
    it('should fail for DSL with "import" action', () => {
      const dsl = {
        type: 'button',
        actions: [{ type: 'import', payload: { module: 'evil' } }],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.toLowerCase().includes('import'))).toBe(true);
    });

    it('should fail for DSL with "call" action', () => {
      const dsl = {
        type: 'button',
        actions: [{ type: 'call', payload: { fn: 'eval' } }],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.toLowerCase().includes('call'))).toBe(true);
    });

    it('should fail for DSL with "dom" action', () => {
      const dsl = {
        type: 'button',
        actions: [{ type: 'dom', payload: { operation: 'remove' } }],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.toLowerCase().includes('dom'))).toBe(true);
    });
  });

  describe('restricted actions with whitelist', () => {
    it('should fail for "fetch" action without whitelist', () => {
      const dsl = {
        type: 'button',
        actions: [{ type: 'fetch', payload: { url: 'https://api.example.com' } }],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.toLowerCase().includes('fetch'))).toBe(true);
    });

    it('should pass for "fetch" action with proper whitelist', () => {
      const dsl = {
        type: 'button',
        actions: [{ type: 'fetch', payload: { url: 'https://api.example.com/data' } }],
      };

      const context: ValidationContext = {
        security: {
          allowedActions: ['fetch'],
          allowedUrlPatterns: ['https://api.example.com/*'],
        },
      };

      const result = validateDsl(dsl, context);
      expect(result.valid).toBe(true);
    });

    it('should fail for "fetch" action with non-matching URL pattern', () => {
      const dsl = {
        type: 'button',
        actions: [{ type: 'fetch', payload: { url: 'https://evil.com/data' } }],
      };

      const context: ValidationContext = {
        security: {
          allowedActions: ['fetch'],
          allowedUrlPatterns: ['https://api.example.com/*'],
        },
      };

      const result = validateDsl(dsl, context);
      expect(result.valid).toBe(false);
    });
  });

  describe('max nesting depth validation', () => {
    it('should fail when nesting depth exceeds limit', () => {
      // Create a deeply nested structure
      const createNested = (depth: number): Record<string, unknown> => {
        if (depth === 0) {
          return { type: 'text', props: { content: 'leaf' } };
        }
        return {
          type: 'container',
          children: [createNested(depth - 1)],
        };
      };

      const dsl = createNested(15); // 15 levels deep

      const context: ValidationContext = {
        security: {
          maxNestingDepth: 10,
        },
      };

      const result = validateDsl(dsl, context);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.toLowerCase().includes('nesting') || e.message.toLowerCase().includes('depth'))).toBe(true);
    });

    it('should pass when nesting depth is within limit', () => {
      const createNested = (depth: number): Record<string, unknown> => {
        if (depth === 0) {
          return { type: 'text', props: { content: 'leaf' } };
        }
        return {
          type: 'container',
          children: [createNested(depth - 1)],
        };
      };

      const dsl = createNested(5); // 5 levels deep

      const context: ValidationContext = {
        security: {
          maxNestingDepth: 10,
        },
      };

      const result = validateDsl(dsl, context);
      expect(result.valid).toBe(true);
    });

    it('should use default max depth when not specified', () => {
      const createNested = (depth: number): Record<string, unknown> => {
        if (depth === 0) {
          return { type: 'text', props: { content: 'leaf' } };
        }
        return {
          type: 'container',
          children: [createNested(depth - 1)],
        };
      };

      const dsl = createNested(50); // Very deep

      const result = validateDsl(dsl);
      // Should still fail or pass based on a reasonable default
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });
  });

  describe('URL validation in navigate action', () => {
    it('should fail for navigate with javascript: URL', () => {
      const dsl = {
        type: 'button',
        actions: [{ type: 'navigate', payload: { url: 'javascript:alert(1)' } }],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.toLowerCase().includes('javascript'))).toBe(true);
    });

    it('should fail for navigate with data: URL', () => {
      const dsl = {
        type: 'button',
        actions: [{ type: 'navigate', payload: { url: 'data:text/html,<script>alert(1)</script>' } }],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(false);
    });

    it('should pass for navigate with safe relative URL', () => {
      const dsl = {
        type: 'button',
        actions: [{ type: 'navigate', payload: { url: '/home' } }],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(true);
    });

    it('should pass for navigate with safe HTTPS URL', () => {
      const dsl = {
        type: 'button',
        actions: [{ type: 'navigate', payload: { url: 'https://example.com' } }],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(true);
    });
  });

  describe('validation context', () => {
    it('should accept empty context', () => {
      const dsl = { type: 'view' };
      const context: ValidationContext = {};

      const result = validateDsl(dsl, context);
      expect(result.valid).toBe(true);
    });

    it('should use path from context in error messages', () => {
      const dsl = {
        type: 'script',
      };

      const context: ValidationContext = {
        path: 'root.children[0]',
      };

      const result = validateDsl(dsl, context);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path?.includes('root'))).toBe(true);
    });

    it('should merge security options from context', () => {
      const dsl = {
        type: 'button',
        actions: [{ type: 'fetch', payload: { url: '/api' } }],
      };

      const context: ValidationContext = {
        security: {
          allowedActions: ['fetch'],
        },
      };

      const result = validateDsl(dsl, context);
      expect(result.valid).toBe(true);
    });
  });

  describe('return type structure', () => {
    it('should return DslValidationResult with valid boolean', () => {
      const result = validateDsl({ type: 'view' });
      expect(typeof result.valid).toBe('boolean');
    });

    it('should return DslValidationResult with errors array', () => {
      const result = validateDsl({ type: 'view' });
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should have empty errors array when valid', () => {
      const result = validateDsl({ type: 'view' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have non-empty errors array when invalid', () => {
      const result = validateDsl({ type: 'script' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle null input gracefully', () => {
      const result = validateDsl(null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle undefined input gracefully', () => {
      const result = validateDsl(undefined);
      expect(result.valid).toBe(false);
    });

    it('should handle non-object input gracefully', () => {
      const result = validateDsl('not an object');
      expect(result.valid).toBe(false);
    });

    it('should handle array input gracefully', () => {
      const result = validateDsl([{ type: 'view' }]);
      expect(result.valid).toBe(false);
    });

    it('should handle object without type property', () => {
      const result = validateDsl({ children: [] });
      expect(result).toBeDefined();
      // May be valid or invalid depending on implementation
    });
  });
});

// ==================== validateNode Function ====================

describe('validateNode', () => {
  describe('valid nodes', () => {
    it('should return empty errors for valid node', () => {
      const node = { type: 'text', props: { content: 'Hello' } };
      const errors = validateNode(node);
      expect(errors).toHaveLength(0);
    });

    it('should return empty errors for node with children', () => {
      const node = {
        type: 'container',
        children: [{ type: 'text' }],
      };
      const errors = validateNode(node);
      expect(errors).toHaveLength(0);
    });
  });

  describe('forbidden tag nodes', () => {
    it('should return error for script node', () => {
      const node = { type: 'script' };
      const errors = validateNode(node);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]?.message.toLowerCase()).toContain('script');
    });

    it('should return error for iframe node', () => {
      const node = { type: 'iframe' };
      const errors = validateNode(node);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('context-aware validation', () => {
    it('should use path from context', () => {
      const node = { type: 'script' };
      const context: ValidationContext = { path: 'root.children[2]' };
      const errors = validateNode(node, context);
      expect(errors[0]?.path).toContain('root');
    });

    it('should apply security options from context', () => {
      const node = {
        type: 'button',
        actions: [{ type: 'fetch', payload: { url: '/api' } }],
      };
      const context: ValidationContext = {
        security: { allowedActions: ['fetch'] },
      };
      const errors = validateNode(node, context);
      expect(errors).toHaveLength(0);
    });
  });

  describe('return type', () => {
    it('should return array of ValidationError', () => {
      const errors = validateNode({ type: 'script' });
      expect(Array.isArray(errors)).toBe(true);
      if (errors.length > 0) {
        expect(errors[0]).toHaveProperty('message');
      }
    });
  });
});

// ==================== validateActions Function ====================

describe('validateActions', () => {
  describe('valid actions', () => {
    it('should return empty errors for navigate action', () => {
      const actions = [{ type: 'navigate', payload: { url: '/home' } }];
      const errors = validateActions(actions);
      expect(errors).toHaveLength(0);
    });

    it('should return empty errors for setState action', () => {
      const actions = [{ type: 'setState', payload: { key: 'value' } }];
      const errors = validateActions(actions);
      expect(errors).toHaveLength(0);
    });

    it('should return empty errors for multiple valid actions', () => {
      const actions = [
        { type: 'navigate', payload: { url: '/page' } },
        { type: 'setState', payload: { loading: true } },
      ];
      const errors = validateActions(actions);
      expect(errors).toHaveLength(0);
    });
  });

  describe('forbidden actions', () => {
    it('should return error for import action', () => {
      const actions = [{ type: 'import', payload: { module: 'evil' } }];
      const errors = validateActions(actions);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]?.message.toLowerCase()).toContain('import');
    });

    it('should return error for call action', () => {
      const actions = [{ type: 'call', payload: { fn: 'eval' } }];
      const errors = validateActions(actions);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return error for dom action', () => {
      const actions = [{ type: 'dom', payload: {} }];
      const errors = validateActions(actions);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return errors for multiple forbidden actions', () => {
      const actions = [
        { type: 'import', payload: {} },
        { type: 'call', payload: {} },
        { type: 'dom', payload: {} },
      ];
      const errors = validateActions(actions);
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('restricted actions', () => {
    it('should return error for fetch without whitelist', () => {
      const actions = [{ type: 'fetch', payload: { url: 'https://api.com' } }];
      const errors = validateActions(actions);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return empty errors for fetch with whitelist', () => {
      const actions = [{ type: 'fetch', payload: { url: 'https://api.com' } }];
      const context: ValidationContext = {
        security: { allowedActions: ['fetch'] },
      };
      const errors = validateActions(actions, context);
      expect(errors).toHaveLength(0);
    });
  });

  describe('URL validation in actions', () => {
    it('should validate URLs in navigate action', () => {
      const actions = [{ type: 'navigate', payload: { url: 'javascript:alert(1)' } }];
      const errors = validateActions(actions);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate URLs in fetch action', () => {
      const actions = [{ type: 'fetch', payload: { url: 'javascript:void(0)' } }];
      const context: ValidationContext = {
        security: { allowedActions: ['fetch'] },
      };
      const errors = validateActions(actions, context);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty actions array', () => {
      const errors = validateActions([]);
      expect(errors).toHaveLength(0);
    });

    it('should handle null actions gracefully', () => {
      const errors = validateActions(null);
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle undefined actions gracefully', () => {
      const errors = validateActions(undefined);
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle non-array actions gracefully', () => {
      const errors = validateActions({ type: 'navigate' });
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle action without type', () => {
      const errors = validateActions([{ payload: { url: '/' } }]);
      expect(Array.isArray(errors)).toBe(true);
    });
  });
});

// ==================== Type Definitions ====================

describe('ValidationContext interface', () => {
  it('should allow empty object', () => {
    const context: ValidationContext = {};
    expect(context).toEqual({});
  });

  it('should accept security options', () => {
    const context: ValidationContext = {
      security: {
        allowedTags: ['view', 'text'],
        allowedActions: ['navigate'],
        maxNestingDepth: 10,
      },
    };
    expect(context.security).toBeDefined();
  });

  it('should accept path string', () => {
    const context: ValidationContext = {
      path: 'root.children[0].props',
    };
    expect(context.path).toBe('root.children[0].props');
  });

  it('should accept all properties together', () => {
    const context: ValidationContext = {
      security: { maxNestingDepth: 5 },
      path: 'root',
    };
    expect(context.security).toBeDefined();
    expect(context.path).toBeDefined();
  });
});

describe('DslValidationResult interface', () => {
  it('should have valid boolean property', () => {
    const result: DslValidationResult = {
      valid: true,
      errors: [],
    };
    expect(result.valid).toBe(true);
  });

  it('should have errors array property', () => {
    const result: DslValidationResult = {
      valid: false,
      errors: [
        { message: 'Forbidden tag: script', path: 'root.children[0]', code: 'FORBIDDEN_TAG' },
      ],
    };
    expect(result.errors).toHaveLength(1);
  });
});

describe('ValidationError type', () => {
  it('should have required message property', () => {
    const error: ValidationError = {
      message: 'Test error',
    };
    expect(error.message).toBe('Test error');
  });

  it('should have optional path property', () => {
    const errorWithPath: ValidationError = {
      message: 'Test error',
      path: 'root.children[0]',
    };
    const errorWithoutPath: ValidationError = {
      message: 'Test error',
    };
    expect(errorWithPath.path).toBe('root.children[0]');
    expect(errorWithoutPath.path).toBeUndefined();
  });

  it('should have optional code property', () => {
    const error: ValidationError = {
      message: 'Forbidden tag detected',
      code: 'FORBIDDEN_TAG',
    };
    expect(error.code).toBe('FORBIDDEN_TAG');
  });

  it('should accept all properties together', () => {
    const error: ValidationError = {
      message: 'Security violation: script tag',
      path: 'root.children[0].type',
      code: 'FORBIDDEN_TAG',
    };
    expect(error.message).toBeDefined();
    expect(error.path).toBeDefined();
    expect(error.code).toBeDefined();
  });
});

// ==================== Integration Scenarios ====================

describe('integration scenarios', () => {
  describe('real-world DSL validation', () => {
    it('should validate a typical view component', () => {
      const dsl = {
        type: 'view',
        props: { className: 'container' },
        children: [
          { type: 'text', props: { content: 'Welcome' } },
          {
            type: 'button',
            props: { label: 'Click Me' },
            actions: [{ type: 'navigate', payload: { url: '/next' } }],
          },
        ],
      };

      const result = validateDsl(dsl);
      expect(result.valid).toBe(true);
    });

    it('should catch XSS attempt in generated DSL', () => {
      const maliciousDsl = {
        type: 'view',
        children: [
          {
            type: 'button',
            actions: [
              {
                type: 'navigate',
                payload: { url: 'javascript:document.cookie' },
              },
            ],
          },
        ],
      };

      const result = validateDsl(maliciousDsl);
      expect(result.valid).toBe(false);
    });

    it('should catch script injection attempt', () => {
      const maliciousDsl = {
        type: 'view',
        children: [
          { type: 'text', props: { content: 'Innocent' } },
          { type: 'script', props: { src: 'https://evil.com/steal.js' } },
        ],
      };

      const result = validateDsl(maliciousDsl);
      expect(result.valid).toBe(false);
    });
  });

  describe('security options enforcement', () => {
    it('should enforce tag whitelist', () => {
      const dsl = {
        type: 'view',
        children: [
          { type: 'custom-element' },
        ],
      };

      const context: ValidationContext = {
        security: {
          allowedTags: ['view', 'text', 'button'],
        },
      };

      const result = validateDsl(dsl, context);
      // custom-element is not in allowed tags
      expect(result.valid).toBe(false);
    });

    it('should enforce action whitelist', () => {
      const dsl = {
        type: 'button',
        actions: [{ type: 'custom-action' }],
      };

      const context: ValidationContext = {
        security: {
          allowedActions: ['navigate', 'setState'],
        },
      };

      const result = validateDsl(dsl, context);
      expect(result.valid).toBe(false);
    });
  });
});
