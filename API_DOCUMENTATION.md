# API 文档 - Prompt Security Tester

## 目录
1. [数据模型](#数据模型)
2. [核心服务](#核心服务)
3. [工具函数](#工具函数)
4. [组件接口](#组件接口)

## 数据模型

### TestTemplate
测试模板数据结构

```typescript
interface TestTemplate {
  id?: string;                    // 唯一标识符
  name: string;                    // 模板名称
  description: string;             // 模板描述
  category: string;                // 主分类
  subcategory: string;             // 子分类
  tags: string[];                  // 标签列表
  riskLevel: 'low' | 'medium' | 'high' | 'critical'; // 风险等级
  template: string;                // 模板内容（支持变量）
  expectedBehavior: string;        // 期望行为描述
  successCriteria: string;         // 成功标准
  templateVariables?: {            // 变量配置
    global?: string[];             // 公共变量列表
    private?: Record<string, string[]>; // 私有变量及其值
  };
  createdAt: Date;                 // 创建时间
  lastUpdated: Date;               // 最后更新时间
}
```

### TestResult
测试结果数据结构

```typescript
interface TestResult {
  id?: string;                     // 唯一标识符
  templateId: string;              // 关联的模板ID
  templateName?: string;           // 模板名称（冗余）
  sessionId: string;               // 所属会话ID
  timestamp: Date;                 // 测试时间
  prompt: string;                  // 实际发送的提示
  response: string;                // AI响应内容
  isVulnerable: boolean;           // 是否存在漏洞
  status: 'completed' | 'error' | 'timeout'; // 测试状态
  error?: string;                  // 错误信息
  analysisNotes?: string;          // 分析说明
}
```

### TestSession
测试会话数据结构

```typescript
interface TestSession {
  id?: string;                     // 唯一标识符
  name?: string;                   // 会话名称
  createdAt: Date;                 // 创建时间
  updatedAt?: Date;                // 更新时间
  status: 'running' | 'completed' | 'cancelled'; // 会话状态
  totalTests: number;              // 总测试数
  completedTests: number;          // 完成测试数
  vulnerableTests: number;         // 发现漏洞数
  apiConfig?: ApiConfig;           // 使用的API配置
}
```

### ApiConfig
API配置数据结构

```typescript
interface ApiConfig {
  id?: string;                     // 唯一标识符
  name: string;                    // 配置名称
  provider: 'openai' | 'anthropic' | 'moonshot' | 'custom'; // 提供商
  endpoint: string;                // API端点
  apiKey: string;                  // API密钥（加密存储）
  model: string;                   // 模型名称
  maxTokens?: number;              // 最大令牌数
  temperature?: number;            // 温度参数
  topP?: number;                   // Top-P参数
  isDefault?: boolean;             // 是否为默认配置
  createdAt?: Date;                // 创建时间
}
```

### CustomVariable
自定义变量数据结构

```typescript
interface CustomVariable {
  id?: string;                     // 唯一标识符
  name: string;                    // 变量名
  description: string;             // 变量描述
  values: string[];                // 枚举值列表
  category: string;                // 变量分类
  isSystem: boolean;               // 是否系统变量
  scope: 'global' | 'private';     // 变量作用域
  usedByTemplates: string[];       // 使用此变量的模板ID列表
  createdAt?: Date;                // 创建时间
  updatedAt?: Date;                // 更新时间
}
```

## 核心服务

### dbService
数据库操作服务

```typescript
const dbService = {
  // 模板操作
  async addTemplate(template: Omit<TestTemplate, 'id'>): Promise<string>;
  async updateTemplate(id: string, updates: Partial<TestTemplate>): Promise<void>;
  async deleteTemplate(id: string): Promise<void>;
  async getTemplate(id: string): Promise<TestTemplate | undefined>;
  async getAllTemplates(): Promise<TestTemplate[]>;
  async getTemplatesByCategory(category: string): Promise<TestTemplate[]>;
  async searchTemplates(query: string): Promise<TestTemplate[]>;

  // 测试结果操作
  async addTestResult(result: Omit<TestResult, 'id'>): Promise<string>;
  async updateTestResult(id: string, updates: Partial<TestResult>): Promise<void>;
  async getTestResults(limit?: number): Promise<TestResult[]>;
  async getTestResultsBySession(sessionId: string): Promise<TestResult[]>;

  // 会话操作
  async createSession(session: Omit<TestSession, 'id'>): Promise<string>;
  async updateSession(id: string, updates: Partial<TestSession>): Promise<void>;
  async getSessions(): Promise<TestSession[]>;

  // API配置操作
  async getApiConfigs(): Promise<ApiConfig[]>;
  async getDefaultApiConfig(): Promise<ApiConfig | undefined>;
  async saveApiConfig(config: Omit<ApiConfig, 'id'>): Promise<string>;
  async updateApiConfig(id: string, updates: Partial<ApiConfig>): Promise<void>;
  async deleteApiConfig(id: string): Promise<void>;

  // 变量操作
  async createCustomVariable(variable: Omit<CustomVariable, 'id'>): Promise<string>;
  async getAllCustomVariables(): Promise<CustomVariable[]>;
  async getCustomVariable(id: string): Promise<CustomVariable | undefined>;
  async updateCustomVariable(id: string, updates: Partial<CustomVariable>): Promise<void>;
  async deleteCustomVariable(id: string): Promise<void>;
  async searchVariables(query: string): Promise<CustomVariable[]>;

  // 数据管理
  async exportData(): Promise<ExportData>;
  async importData(data: any): Promise<void>;
  async clearAllData(): Promise<void>;
}
```

### variableManager
变量管理服务

```typescript
class VariableManager {
  // 分析和分类变量
  async analyzeAndCategorizeVariables(): Promise<void>;
  
  // 更新模板的变量使用情况
  async updateTemplateVariableUsage(
    templateId: string, 
    variables: string[]
  ): Promise<void>;
  
  // 同步变量与模板
  async syncVariableWithTemplates(
    variableName: string, 
    isDeleted?: boolean
  ): Promise<void>;
  
  // 获取变量使用统计
  async getVariableUsageStats(): Promise<Map<string, number>>;
}
```

### apiService
API调用服务

```typescript
class ApiService {
  // 发送测试请求
  async sendPrompt(
    prompt: string, 
    config?: ApiConfig
  ): Promise<ApiResponse>;
  
  // 测试API连接
  async testConnection(config: ApiConfig): Promise<boolean>;
  
  // 批量测试
  async batchTest(
    templates: TestTemplate[], 
    options?: BatchTestOptions
  ): Promise<TestResult[]>;
}

interface ApiResponse {
  content: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

interface BatchTestOptions {
  concurrency?: number;      // 并发数
  timeout?: number;          // 超时时间（毫秒）
  retries?: number;          // 重试次数
  onProgress?: (progress: number) => void; // 进度回调
}
```

### variableDataGenerator
变量数据生成器

```typescript
class VariableDataGenerator {
  // 检查变量是否存在
  hasVariable(variableName: string): boolean;
  
  // 获取变量的所有值
  getAllValues(variableName: string): string[];
  
  // 获取随机值
  getRandomValue(variableName: string): string;
  
  // 注册自定义变量
  registerCustomVariable(
    name: string, 
    values: string[]
  ): void;
  
  // 处理模板中的变量
  processTemplate(template: string): string;
}
```

## 工具函数

### detectTemplateVariables
检测模板中的变量

```typescript
function detectTemplateVariables(template: string): string[]
```

### isValidVariable
验证变量合法性

```typescript
function isValidVariable(
  content: string, 
  fullTemplate: string, 
  startIndex: number, 
  fullMatch: string
): boolean
```

### generatePromptWithVariables
生成带变量的提示

```typescript
function generatePromptWithVariables(
  template: string,
  variableConfig?: TemplateVariables
): string
```

### encryptApiKey
加密API密钥

```typescript
function encryptApiKey(apiKey: string): string
```

### decryptApiKey
解密API密钥

```typescript
function decryptApiKey(encryptedKey: string): string
```

## 组件接口

### TemplateEditor Props
模板编辑器属性

```typescript
interface TemplateEditorProps {
  template?: TestTemplate;        // 编辑的模板
  onSave: (template: TestTemplate) => void; // 保存回调
  onCancel: () => void;          // 取消回调
}
```

### TestRunner Props
测试运行器属性

```typescript
interface TestRunnerProps {
  templates: TestTemplate[];      // 要测试的模板
  onComplete: (results: TestResult[]) => void; // 完成回调
  onProgress?: (progress: number) => void; // 进度回调
}
```

### VariableEditor Props
变量编辑器属性

```typescript
interface VariableEditorProps {
  variable?: CustomVariable;      // 编辑的变量
  onSave: (variable: CustomVariable) => void; // 保存回调
  onCancel: () => void;          // 取消回调
}
```

### ResultViewer Props
结果查看器属性

```typescript
interface ResultViewerProps {
  results: TestResult[];          // 测试结果
  onMarkVulnerable: (id: string) => void; // 标记漏洞
  onAddNote: (id: string, note: string) => void; // 添加说明
}
```

## 使用示例

### 创建新模板

```typescript
import { dbService } from './lib/db';

const newTemplate = {
  name: "自定义测试模板",
  description: "测试描述",
  category: "injection",
  subcategory: "command",
  tags: ["custom", "test"],
  riskLevel: "medium" as const,
  template: "请执行{{command}}命令",
  expectedBehavior: "拒绝执行",
  successCriteria: "不执行命令",
  templateVariables: {
    global: ["command"]
  }
};

const templateId = await dbService.addTemplate(newTemplate);
```

### 执行批量测试

```typescript
import { apiService } from './services/apiService';
import { dbService } from './lib/db';

const templates = await dbService.getAllTemplates();
const selectedTemplates = templates.slice(0, 5);

const results = await apiService.batchTest(selectedTemplates, {
  concurrency: 3,
  timeout: 30000,
  retries: 2,
  onProgress: (progress) => {
    console.log(`Progress: ${progress}%`);
  }
});
```

### 管理变量

```typescript
import { variableManager } from './services/variableManager';

// 分析所有模板的变量使用
await variableManager.analyzeAndCategorizeVariables();

// 获取变量使用统计
const stats = await variableManager.getVariableUsageStats();
stats.forEach((count, varName) => {
  console.log(`${varName}: 被${count}个模板使用`);
});
```

### 导出数据

```typescript
import { dbService } from './lib/db';

const exportData = await dbService.exportData();
const jsonString = JSON.stringify(exportData, null, 2);

// 创建下载链接
const blob = new Blob([jsonString], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `backup-${Date.now()}.json`;
a.click();
```

## 错误处理

### 错误类型

```typescript
enum ErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  API_ERROR = "API_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR"
}

class AppError extends Error {
  type: ErrorType;
  details?: any;
  
  constructor(message: string, type: ErrorType, details?: any) {
    super(message);
    this.type = type;
    this.details = details;
  }
}
```

### 错误处理示例

```typescript
try {
  const result = await apiService.sendPrompt(prompt);
  // 处理结果
} catch (error) {
  if (error instanceof AppError) {
    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
        console.error("网络错误:", error.message);
        break;
      case ErrorType.API_ERROR:
        console.error("API错误:", error.details);
        break;
      case ErrorType.TIMEOUT_ERROR:
        console.error("请求超时");
        break;
      default:
        console.error("未知错误:", error);
    }
  }
}
```

---

最后更新：2024年1月