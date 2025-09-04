import type { 
  TestTemplate, 
  TestResult, 
  ApiConfig, 
  Session,
  CustomVariable,
  TemplateVariable 
} from './index';

/**
 * Type guard to check if a value is a valid TestTemplate
 */
export function isTestTemplate(value: unknown): value is TestTemplate {
  if (!value || typeof value !== 'object') return false;
  
  const template = value as Record<string, unknown>;
  
  return (
    typeof template.name === 'string' &&
    typeof template.description === 'string' &&
    typeof template.template === 'string' &&
    typeof template.category === 'string' &&
    (typeof template.riskLevel === 'string' && 
     ['low', 'medium', 'high', 'critical'].includes(template.riskLevel)) &&
    (!template.variables || Array.isArray(template.variables)) &&
    (!template.successCriteria || typeof template.successCriteria === 'object')
  );
}

/**
 * Type guard to check if a value is a valid ApiConfig
 */
export function isApiConfig(value: unknown): value is ApiConfig {
  if (!value || typeof value !== 'object') return false;
  
  const config = value as Record<string, unknown>;
  
  return (
    typeof config.name === 'string' &&
    typeof config.provider === 'string' &&
    ['openai', 'anthropic', 'custom', 'mock'].includes(config.provider) &&
    typeof config.endpoint === 'string' &&
    typeof config.apiKey === 'string' &&
    (!config.model || typeof config.model === 'string')
  );
}

/**
 * Type guard to check if a value is a valid TestResult
 */
export function isTestResult(value: unknown): value is TestResult {
  if (!value || typeof value !== 'object') return false;
  
  const result = value as Record<string, unknown>;
  
  return (
    typeof result.templateId === 'string' &&
    typeof result.templateName === 'string' &&
    typeof result.prompt === 'string' &&
    typeof result.response === 'string' &&
    typeof result.isVulnerable === 'boolean' &&
    typeof result.confidenceScore === 'number' &&
    typeof result.executionTime === 'number' &&
    result.timestamp instanceof Date
  );
}

/**
 * Type guard to check if a value is a valid Session
 */
export function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  
  const session = value as Record<string, unknown>;
  
  return (
    typeof session.name === 'string' &&
    typeof session.totalTests === 'number' &&
    typeof session.completedTests === 'number' &&
    typeof session.vulnerableTests === 'number' &&
    typeof session.status === 'string' &&
    ['running', 'paused', 'completed', 'failed'].includes(session.status)
  );
}

/**
 * Type guard to check if a value is a valid CustomVariable
 */
export function isCustomVariable(value: unknown): value is CustomVariable {
  if (!value || typeof value !== 'object') return false;
  
  const variable = value as Record<string, unknown>;
  
  return (
    typeof variable.name === 'string' &&
    typeof variable.description === 'string' &&
    Array.isArray(variable.values) &&
    variable.values.every((v: unknown) => typeof v === 'string') &&
    typeof variable.category === 'string' &&
    typeof variable.isSystem === 'boolean'
  );
}

/**
 * Type guard to check if a value is a valid TemplateVariable
 */
export function isTemplateVariable(value: unknown): value is TemplateVariable {
  if (!value || typeof value !== 'object') return false;
  
  const variable = value as Record<string, unknown>;
  
  return (
    typeof variable.name === 'string' &&
    typeof variable.description === 'string' &&
    (!variable.defaultValue || typeof variable.defaultValue === 'string') &&
    (!variable.options || (Array.isArray(variable.options) && 
     variable.options.every((o: unknown) => typeof o === 'string')))
  );
}

/**
 * Validate and sanitize import data
 */
export function validateImportData(data: unknown): {
  valid: boolean;
  errors: string[];
  sanitized?: {
    templates: TestTemplate[];
    variables: CustomVariable[];
  };
} {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Invalid data format'] };
  }
  
  const importData = data as Record<string, unknown>;
  
  // Validate templates
  if (!Array.isArray(importData.templates)) {
    errors.push('Templates must be an array');
  } else {
    const invalidTemplates = importData.templates
      .map((t, i) => ({ template: t, index: i }))
      .filter(({ template }) => !isTestTemplate(template));
    
    if (invalidTemplates.length > 0) {
      errors.push(`Invalid templates at indices: ${invalidTemplates.map(t => t.index).join(', ')}`);
    }
  }
  
  // Validate variables if present
  if (importData.variables && !Array.isArray(importData.variables)) {
    errors.push('Variables must be an array');
  } else if (importData.variables) {
    const invalidVariables = (importData.variables as unknown[])
      .map((v, i) => ({ variable: v, index: i }))
      .filter(({ variable }) => !isCustomVariable(variable));
    
    if (invalidVariables.length > 0) {
      errors.push(`Invalid variables at indices: ${invalidVariables.map(v => v.index).join(', ')}`);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    errors: [],
    sanitized: {
      templates: importData.templates as TestTemplate[],
      variables: (importData.variables || []) as CustomVariable[],
    },
  };
}