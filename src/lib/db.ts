import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { TestTemplate, TestResult, TestSession, ApiConfig } from '../types';

export class PromptSecurityDB extends Dexie {
  templates!: Table<TestTemplate>;
  results!: Table<TestResult>;
  sessions!: Table<TestSession>;
  apiConfigs!: Table<ApiConfig>;

  constructor() {
    super('PromptSecurityDB');
    
    this.version(1).stores({
      templates: '++id, category, subcategory, name, riskLevel, *tags, createdAt, lastUpdated',
      results: '++id, templateId, sessionId, timestamp, isVulnerable, status',
      sessions: '++id, createdAt, status',
      apiConfigs: '++id, name, provider, isDefault, createdAt'
    });
  }

  async initializeDefaults() {
    const configCount = await this.apiConfigs.count();
    if (configCount === 0) {
      await this.apiConfigs.add({
        name: 'Kimi K2 API',
        provider: 'moonshot',
        endpoint: 'https://api.moonshot.cn/v1/chat/completions',
        apiKey: '',
        model: 'kimi-k2-0711-preview',
        maxTokens: 4096,
        temperature: 0.7,
        isDefault: true,
        createdAt: new Date()
      });
    }
  }
}

export const db = new PromptSecurityDB();

export const dbService = {
  async addTemplate(template: Omit<TestTemplate, 'id' | 'createdAt' | 'lastUpdated'>) {
    return await db.templates.add({
      ...template,
      createdAt: new Date(),
      lastUpdated: new Date()
    });
  },

  async updateTemplate(id: string, updates: Partial<TestTemplate>) {
    return await db.templates.update(id, {
      ...updates,
      lastUpdated: new Date()
    });
  },

  async deleteTemplate(id: string) {
    return await db.templates.delete(id);
  },

  async getTemplate(id: string) {
    return await db.templates.get(id);
  },

  async getAllTemplates() {
    return await db.templates.toArray();
  },

  async getTemplatesByCategory(category: string) {
    return await db.templates.where('category').equals(category).toArray();
  },

  async searchTemplates(query: string) {
    const allTemplates = await db.templates.toArray();
    const lowercaseQuery = query.toLowerCase();
    return allTemplates.filter(template => 
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  },

  async addTestResult(result: Omit<TestResult, 'id'>) {
    return await db.results.add(result);
  },

  async updateTestResult(id: string, updates: Partial<TestResult>) {
    return await db.results.update(id, updates);
  },

  async getTestResults(limit?: number) {
    if (limit) {
      return await db.results.orderBy('timestamp').reverse().limit(limit).toArray();
    }
    return await db.results.orderBy('timestamp').reverse().toArray();
  },

  async getTestResultsBySession(sessionId: string) {
    return await db.results.where('sessionId').equals(sessionId).toArray();
  },

  async createSession(session: Omit<TestSession, 'id'>) {
    return await db.sessions.add(session);
  },

  async updateSession(id: string, updates: Partial<TestSession>) {
    return await db.sessions.update(id, {
      ...updates,
      updatedAt: new Date()
    });
  },

  async getSessions() {
    return await db.sessions.orderBy('createdAt').reverse().toArray();
  },

  async getApiConfigs() {
    return await db.apiConfigs.toArray();
  },

  async getDefaultApiConfig() {
    const configs = await db.apiConfigs.toArray();
    return configs.find(c => c.isDefault === true);
  },

  async saveApiConfig(config: Omit<ApiConfig, 'id' | 'createdAt'>) {
    if (config.isDefault) {
      // 将其他配置的 isDefault 设置为 false
      const configs = await db.apiConfigs.toArray();
      for (const c of configs) {
        if (c.isDefault) {
          await db.apiConfigs.update(c.id!, { isDefault: false });
        }
      }
    }
    return await db.apiConfigs.add({
      ...config,
      createdAt: new Date()
    });
  },

  async updateApiConfig(id: string, updates: Partial<ApiConfig>) {
    if (updates.isDefault) {
      // 将其他配置的 isDefault 设置为 false
      const configs = await db.apiConfigs.toArray();
      for (const c of configs) {
        if (c.id !== id && c.isDefault) {
          await db.apiConfigs.update(c.id!, { isDefault: false });
        }
      }
    }
    return await db.apiConfigs.update(id, updates);
  },

  async deleteApiConfig(id: string) {
    return await db.apiConfigs.delete(id);
  },

  async exportData() {
    const templates = await db.templates.toArray();
    const results = await db.results.toArray();
    const sessions = await db.sessions.toArray();
    const apiConfigs = await db.apiConfigs.toArray();

    return {
      templates,
      results,
      sessions,
      apiConfigs,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
  },

  async importData(data: any) {
    if (data.templates) {
      await db.templates.bulkAdd(data.templates);
    }
    if (data.results) {
      await db.results.bulkAdd(data.results);
    }
    if (data.sessions) {
      await db.sessions.bulkAdd(data.sessions);
    }
    if (data.apiConfigs) {
      await db.apiConfigs.bulkAdd(data.apiConfigs);
    }
  },

  async clearAllData() {
    await db.templates.clear();
    await db.results.clear();
    await db.sessions.clear();
    await db.apiConfigs.clear();
  }
};

db.on('ready', function() {
  return db.initializeDefaults();
});