export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface TestTemplate {
  id?: string;
  category: string;
  subcategory: string;
  name: string;
  description: string;
  riskLevel: RiskLevel;
  template: string;
  variables: TemplateVariable[];  // 保持向后兼容
  
  // 新增：模板专属变量定义
  localVariables?: {
    [variableName: string]: {
      description: string;
      values: string[];
      isOverride?: boolean;  // 是否覆盖同名全局变量
      source?: 'local' | 'global';  // 变量来源
    };
  };
  
  // 新增：变量配置选项
  variableConfig?: {
    useGlobalVariables?: boolean;  // 是否使用全局变量库（默认true）
    importedVariables?: string[];  // 明确引入的全局变量名
    autoDetectVariables?: boolean; // 是否自动检测模板中的变量（默认true）
  };
  
  tags: string[];
  successCriteria: SuccessCriteria;
  version: string;
  lastUpdated: Date;
  createdAt: Date;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'select' | 'number' | 'boolean';
  label: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface SuccessCriteria {
  type: 'keywords' | 'pattern' | 'custom';
  keywords?: string[];
  patterns?: string[];
  customFunction?: string;
  threshold?: number;
}

export interface TestResult {
  id?: string;
  templateId: string;
  templateName: string;
  prompt: string;
  response: string;
  isVulnerable: boolean;
  confidenceScore: number;
  executionTime: number;
  timestamp: Date;
  apiUsed: string;
  detectedPatterns: string[];
  error?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface TestSession {
  id?: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  totalTests: number;
  completedTests: number;
  vulnerableTests: number;
  status: 'pending' | 'running' | 'completed' | 'paused';
}

export interface ApiConfig {
  id?: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'moonshot' | 'custom';
  endpoint: string;
  apiKey: string;
  model?: string;
  headers?: Record<string, string>;
  maxTokens?: number;
  temperature?: number;
  isDefault: boolean;
  createdAt: Date;
}

export interface AttackCategory {
  id: string;
  name: string;
  description: string;
  subcategories: string[];
  color: string;
  icon?: string;
}

export const ATTACK_CATEGORIES: AttackCategory[] = [
  {
    id: 'role-playing',
    name: '角色扮演类',
    description: '通过让模型扮演特定角色来绕过限制',
    subcategories: ['DAN变体', '专家模拟', '虚构场景'],
    color: '#ef4444'
  },
  {
    id: 'instruction-injection',
    name: '指令注入类',
    description: '通过注入额外指令覆盖原有安全设置',
    subcategories: ['系统提示覆盖', '优先级劫持', '多层嵌套指令'],
    color: '#f59e0b'
  },
  {
    id: 'encoding-obfuscation',
    name: '编码混淆类',
    description: '使用各种编码技术混淆敏感内容',
    subcategories: ['Base64编码', 'ROT13替换', '同音词替换', '语言混合'],
    color: '#10b981'
  },
  {
    id: 'context-manipulation',
    name: '上下文操纵类',
    description: '通过构建特定上下文引导模型输出',
    subcategories: ['预设场景构建', '虚假前提注入', '逐步诱导策略'],
    color: '#3b82f6'
  },
  {
    id: 'output-format',
    name: '输出格式利用',
    description: '利用特定输出格式绕过内容检测',
    subcategories: ['JSON模式绕过', '代码块伪装', 'Markdown注入'],
    color: '#8b5cf6'
  },
  {
    id: 'cognitive-bias',
    name: '认知偏差利用',
    description: '利用模型的认知偏差进行攻击',
    subcategories: ['紧急情况模拟', '道德困境构造', '情感操纵'],
    color: '#ec4899'
  }
];