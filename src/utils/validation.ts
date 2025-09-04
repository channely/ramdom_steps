/**
 * Input validation and sanitization utilities
 */

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize template content
 */
export function validateTemplateContent(content: string): {
  valid: boolean;
  sanitized: string;
  errors: string[];
} {
  const errors: string[] = [];
  let sanitized = content;

  // Check for minimum length
  if (content.length < 10) {
    errors.push('Template content must be at least 10 characters');
  }

  // Check for maximum length
  if (content.length > 10000) {
    errors.push('Template content must not exceed 10000 characters');
    sanitized = content.substring(0, 10000);
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
  ];

  dangerousPatterns.forEach((pattern) => {
    if (pattern.test(content)) {
      errors.push('Template contains potentially dangerous content');
      sanitized = sanitized.replace(pattern, '');
    }
  });

  return {
    valid: errors.length === 0,
    sanitized,
    errors,
  };
}

/**
 * Validate variable name
 */
export function validateVariableName(name: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check format
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    errors.push('Variable name must start with a letter or underscore and contain only alphanumeric characters and underscores');
  }

  // Check length
  if (name.length < 2) {
    errors.push('Variable name must be at least 2 characters');
  }

  if (name.length > 50) {
    errors.push('Variable name must not exceed 50 characters');
  }

  // Check for reserved words
  const reserved = ['id', 'name', 'template', 'created', 'updated', 'deleted'];
  if (reserved.includes(name.toLowerCase())) {
    errors.push(`"${name}" is a reserved word`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate API key format
 */
export function validateApiKey(key: string, provider: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!key || key.trim().length === 0) {
    errors.push('API key is required');
    return { valid: false, errors };
  }

  switch (provider) {
    case 'openai':
      if (!key.startsWith('sk-') || key.length < 40) {
        errors.push('Invalid OpenAI API key format');
      }
      break;
    case 'anthropic':
      if (!key.startsWith('sk-ant-') || key.length < 40) {
        errors.push('Invalid Anthropic API key format');
      }
      break;
    case 'custom':
      if (key.length < 10) {
        errors.push('API key must be at least 10 characters');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  try {
    const parsed = new URL(url);
    
    // Check protocol
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      errors.push('URL must use HTTP or HTTPS protocol');
    }

    // Check for localhost in production
    if (process.env.NODE_ENV === 'production' && 
        (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      errors.push('Cannot use localhost URLs in production');
    }
  } catch {
    errors.push('Invalid URL format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate risk level
 */
export function validateRiskLevel(level: string): {
  valid: boolean;
  errors: string[];
} {
  const validLevels = ['low', 'medium', 'high', 'critical'];
  const errors: string[] = [];

  if (!validLevels.includes(level)) {
    errors.push(`Risk level must be one of: ${validLevels.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate numeric range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (isNaN(value)) {
    errors.push(`${fieldName} must be a number`);
  } else if (value < min) {
    errors.push(`${fieldName} must be at least ${min}`);
  } else if (value > max) {
    errors.push(`${fieldName} must not exceed ${max}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Batch validation helper
 */
export function validateAll(
  validations: Array<{ valid: boolean; errors: string[] }>
): {
  valid: boolean;
  errors: string[];
} {
  const allErrors = validations.flatMap(v => v.errors);
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Create a validation error message
 */
export function createValidationMessage(errors: string[]): string {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  return `Multiple validation errors:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
}