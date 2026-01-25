export type AiErrorCode =
  | 'PROVIDER_NOT_CONFIGURED'
  | 'PROVIDER_NOT_FOUND'
  | 'API_ERROR'
  | 'VALIDATION_ERROR'
  | 'SECURITY_VIOLATION'
  | 'RATE_LIMIT_EXCEEDED';

export class AiError extends Error {
  constructor(
    message: string,
    public readonly code: AiErrorCode
  ) {
    super(message);
    this.name = 'AiError';
    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AiError.prototype);
  }

  toJSON(): { name: string; message: string; code: AiErrorCode } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
    };
  }
}

export class ValidationError extends AiError {
  constructor(
    message: string,
    public readonly violations: string[]
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  override toJSON(): { name: string; message: string; code: AiErrorCode; violations: string[] } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      violations: this.violations,
    };
  }
}

export class SecurityError extends AiError {
  constructor(
    message: string,
    public readonly violation: string
  ) {
    super(message, 'SECURITY_VIOLATION');
    this.name = 'SecurityError';
    // Maintain proper prototype chain
    Object.setPrototypeOf(this, SecurityError.prototype);
  }

  override toJSON(): { name: string; message: string; code: AiErrorCode; violation: string } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      violation: this.violation,
    };
  }
}
