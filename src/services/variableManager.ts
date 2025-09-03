import { dbService, type CustomVariable } from '../lib/db';
import type { TestTemplate } from '../types';
import { detectTemplateVariables } from '../utils/variableDetector';
import { variableDataGenerator } from './variableDataGenerator';

export interface ManagedVariable extends CustomVariable {
  templateCount: number;  // 使用此变量的模板数量
  isBuiltin: boolean;  // 是否为内置变量（存在于variableDataGenerator中）
}

class VariableManagerService {
  /**
   * 分析所有模板并自动分类变量
   */
  async analyzeAndCategorizeVariables(): Promise<void> {
    const templates = await dbService.getAllTemplates();
    const variableUsageMap = new Map<string, Set<string>>(); // 变量名 -> 使用它的模板ID集合
    
    // 1. 统计每个变量被哪些模板使用
    for (const template of templates) {
      const detectedVars = detectTemplateVariables(template.template);
      
      for (const varName of detectedVars) {
        if (!variableUsageMap.has(varName)) {
          variableUsageMap.set(varName, new Set());
        }
        if (template.id) {
          variableUsageMap.get(varName)!.add(template.id);
        }
      }
    }
    
    // 2. 获取现有的自定义变量
    const existingVariables = await dbService.getAllCustomVariables();
    const existingVarMap = new Map(existingVariables.map(v => [v.name, v]));
    
    // 3. 分类并更新或创建变量
    for (const [varName, templateIds] of variableUsageMap.entries()) {
      const templateCount = templateIds.size;
      const scope: 'global' | 'private' = templateCount >= 2 ? 'global' : 'private';
      const usedByTemplates = Array.from(templateIds);
      
      const existingVar = existingVarMap.get(varName);
      
      if (existingVar && existingVar.id) {
        // 更新现有变量
        await dbService.updateCustomVariable(existingVar.id, {
          scope,
          usedByTemplates
        });
      } else {
        // 创建新变量（包括原内置变量）
        let values: string[] = [`示例${varName}值`]; // 默认值
        let category = 'custom';
        let description = `${scope === 'global' ? '公共' : '私有'}变量`;
        
        // 如果是原内置变量，使用其预定义的值
        if (variableDataGenerator.hasVariable(varName)) {
          values = variableDataGenerator.getAllValues(varName);
          category = 'builtin';
          description = varName.replace(/_/g, ' ');
        }
        
        await dbService.createCustomVariable({
          name: varName,
          description,
          values,
          category,
          isSystem: false,
          scope,
          usedByTemplates
        });
      }
    }
    
    // 4. 清理不再使用的变量（可选，保留以供历史参考）
    for (const existingVar of existingVariables) {
      if (!variableUsageMap.has(existingVar.name) && existingVar.id) {
        // 更新为未使用状态
        await dbService.updateCustomVariable(existingVar.id, {
          usedByTemplates: []
        });
      }
    }
  }
  
  /**
   * 获取所有管理的变量
   */
  async getAllManagedVariables(): Promise<ManagedVariable[]> {
    const customVariables = await dbService.getAllCustomVariables();
    const managedVariables: ManagedVariable[] = [];
    
    // 所有变量都存储在数据库中
    for (const customVar of customVariables) {
      managedVariables.push({
        ...customVar,
        templateCount: customVar.usedByTemplates?.length || 0,
        isBuiltin: customVar.category === 'builtin'  // 根据类别判断是否原为内置变量
      });
    }
    
    return managedVariables;
  }
  
  /**
   * 创建新变量
   */
  async createVariable(variable: Omit<CustomVariable, 'id' | 'createdAt' | 'updatedAt' | 'isSystem'>): Promise<string> {
    // 检查重名
    const existing = await dbService.getAllCustomVariables();
    if (existing.some(v => v.name === variable.name)) {
      throw new Error(`变量名 "${variable.name}" 已存在`);
    }
    
    // 检查是否与内置变量重名
    if (variableDataGenerator.hasVariable(variable.name)) {
      throw new Error(`变量名 "${variable.name}" 是内置变量，不能创建同名变量`);
    }
    
    return await dbService.createCustomVariable({
      ...variable,
      isSystem: false
    });
  }
  
  /**
   * 更新变量（不允许修改名称）
   */
  async updateVariable(id: string, updates: Partial<Omit<CustomVariable, 'id' | 'name' | 'isSystem'>>): Promise<void> {
    const variable = await dbService.getCustomVariable(id);
    
    if (!variable) {
      throw new Error('变量不存在');
    }
    
    await dbService.updateCustomVariable(id, updates);
    
    // 如果修改了值，需要更新 variableDataGenerator
    if (updates.values) {
      variableDataGenerator.addVariableData(variable.name, updates.values);
    }
  }
  
  /**
   * 删除变量
   */
  async deleteVariable(id: string): Promise<void> {
    const variable = await dbService.getCustomVariable(id);
    
    if (!variable) {
      throw new Error('变量不存在');
    }
    
    if (variable.usedByTemplates && variable.usedByTemplates.length > 0) {
      throw new Error(`变量 "${variable.name}" 正在被 ${variable.usedByTemplates.length} 个模板使用，不能删除`);
    }
    
    await dbService.deleteCustomVariable(id);
  }
  
  /**
   * 同步模板变量更新
   */
  async syncTemplateVariables(templateId: string, oldVars: string[], newVars: string[]): Promise<void> {
    const removedVars = oldVars.filter(v => !newVars.includes(v));
    const addedVars = newVars.filter(v => !oldVars.includes(v));
    
    const allCustomVars = await dbService.getAllCustomVariables();
    
    // 处理移除的变量
    for (const varName of removedVars) {
      const customVar = allCustomVars.find(v => v.name === varName);
      if (customVar && customVar.id) {
        const newUsedBy = (customVar.usedByTemplates || []).filter(id => id !== templateId);
        const newScope = newUsedBy.length >= 2 ? 'global' : 'private';
        
        await dbService.updateCustomVariable(customVar.id, {
          usedByTemplates: newUsedBy,
          scope: newScope
        });
      }
    }
    
    // 处理新增的变量
    for (const varName of addedVars) {
      const customVar = allCustomVars.find(v => v.name === varName);
      
      if (customVar && customVar.id) {
        const newUsedBy = [...(customVar.usedByTemplates || []), templateId];
        const newScope = newUsedBy.length >= 2 ? 'global' : 'private';
        
        await dbService.updateCustomVariable(customVar.id, {
          usedByTemplates: newUsedBy,
          scope: newScope
        });
      } else if (!variableDataGenerator.hasVariable(varName)) {
        // 创建新的私有变量
        await dbService.createCustomVariable({
          name: varName,
          description: '私有变量',
          values: [`示例${varName}值`],
          category: 'custom',
          isSystem: false,
          scope: 'private',
          usedByTemplates: [templateId]
        });
      }
    }
  }
  
  /**
   * 获取变量的使用模板
   */
  async getVariableUsage(varName: string): Promise<TestTemplate[]> {
    const templates = await dbService.getAllTemplates();
    const usedTemplates: TestTemplate[] = [];
    
    for (const template of templates) {
      const detectedVars = detectTemplateVariables(template.template);
      if (detectedVars.includes(varName)) {
        usedTemplates.push(template);
      }
    }
    
    return usedTemplates;
  }
}

export const variableManager = new VariableManagerService();