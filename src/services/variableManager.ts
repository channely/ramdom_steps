import { dbService, type CustomVariable } from '../lib/db';
import type { TestTemplate } from '../types';
import { detectTemplateVariables } from '../utils/variableDetector';

export interface ManagedVariable extends CustomVariable {
  templateCount: number;  // 使用此变量的模板数量
  isBuiltin: boolean;  // 是否为内置变量（保留字段，始终为false）
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
      // 只根据使用次数判定作用域
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
        // 创建新变量
        let values: string[] = [];
        let category = 'custom';
        let description = `${scope === 'global' ? '公共' : '私有'}变量`;
        
        // 私有变量初始化为空数组，让用户在模板编辑器中定义
        if (scope === 'private') {
          values = [];
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
    
    // 不再需要检查内置变量
    
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
   * @param templateId 模板ID
   * @param oldVars 旧变量列表
   * @param newVars 新变量列表
   * @param privateVarValues 私有变量的值（从模板编辑器传入）
   */
  async syncTemplateVariables(
    templateId: string, 
    oldVars: string[], 
    newVars: string[],
    privateVarValues?: Record<string, string[]>
  ): Promise<void> {
    const removedVars = oldVars.filter(v => !newVars.includes(v));
    const addedVars = newVars.filter(v => !oldVars.includes(v));
    
    const allCustomVars = await dbService.getAllCustomVariables();
    const allTemplates = await dbService.getAllTemplates();
    
    // 统计每个变量的使用情况
    const varUsageMap = new Map<string, Set<string>>();
    for (const tpl of allTemplates) {
      if (tpl.id === templateId) continue; // 跳过当前模板
      const tplVars = detectTemplateVariables(tpl.template);
      for (const varName of tplVars) {
        if (!varUsageMap.has(varName)) {
          varUsageMap.set(varName, new Set());
        }
        if (tpl.id) {
          varUsageMap.get(varName)!.add(tpl.id);
        }
      }
    }
    
    // 处理移除的变量
    for (const varName of removedVars) {
      const customVar = allCustomVars.find(v => v.name === varName);
      if (customVar && customVar.id) {
        const otherUsage = varUsageMap.get(varName) || new Set();
        const newUsedBy = Array.from(otherUsage);
        const newScope = newUsedBy.length >= 2 ? 'global' : 'private';
        
        if (newUsedBy.length === 0) {
          // 如果没有其他模板使用，删除该变量
          await dbService.deleteCustomVariable(customVar.id);
        } else {
          await dbService.updateCustomVariable(customVar.id, {
            usedByTemplates: newUsedBy,
            scope: newScope
          });
        }
      }
    }
    
    // 处理所有当前变量（包括新增的）
    for (const varName of newVars) {
      const customVar = allCustomVars.find(v => v.name === varName);
      const otherUsage = varUsageMap.get(varName) || new Set();
      const allUsage = new Set([...Array.from(otherUsage), templateId]);
      const usageCount = allUsage.size;
      // 只根据使用次数判定作用域，不管是否有预定义值
      const newScope = usageCount >= 2 ? 'global' : 'private';
      
      if (customVar && customVar.id) {
        // 更新现有变量
        const updates: any = {
          usedByTemplates: Array.from(allUsage),
          scope: newScope
        };
        
        // 如果是私有变量且提供了值，更新值
        // 重要：总是保存用户在模板编辑器中输入的值
        if (newScope === 'private' && privateVarValues && privateVarValues[varName]) {
          // 过滤掉空值
          const validValues = privateVarValues[varName].filter(v => v && v.trim());
          if (validValues.length > 0) {
            updates.values = validValues;
            console.log(`[variableManager] Updating ${varName} with user values:`, validValues);
          }
        }
        
        await dbService.updateCustomVariable(customVar.id, updates);
      } else {
        // 创建新变量
        let values: string[] = [];
        
        // 使用模板编辑器中定义的值
        if (privateVarValues && privateVarValues[varName]) {
          // 过滤掉空值
          const validValues = privateVarValues[varName].filter(v => v && v.trim());
          if (validValues.length > 0) {
            values = validValues;
            console.log(`[variableManager] Creating ${varName} with user values:`, validValues);
          }
        }
        
        await dbService.createCustomVariable({
          name: varName,
          description: newScope === 'global' ? '公共变量' : '私有变量',
          values,
          category: 'custom',
          isSystem: false,
          scope: newScope,
          usedByTemplates: Array.from(allUsage)
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