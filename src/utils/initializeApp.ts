import { dbService } from '../lib/db';
import initialTemplates from '../data/initialTemplates';
import advancedTemplates from '../data/advancedTemplates';
import { loadCustomVariablesToGenerator } from './loadCustomVariables';
import { variableDataGenerator } from '../services/variableDataGenerator';
import { detectTemplateVariables } from './variableDetector';
import type { TestTemplate } from '../types';

export const initializeApp = async () => {
  try {
    // 检查是否已经初始化过
    const existingTemplates = await dbService.getAllTemplates();
    
    if (existingTemplates.length === 0) {
      console.log('初始化模板库...');
      
      // 加载初始模板
      for (const template of initialTemplates) {
        await dbService.addTemplate(template);
      }
      
      // 同时加载高级模板（全新安装时）
      for (const template of advancedTemplates) {
        await dbService.addTemplate(template);
      }
      
      const totalTemplates = initialTemplates.length + advancedTemplates.length;
      console.log(`成功加载 ${totalTemplates} 个模板（基础: ${initialTemplates.length}, 高级: ${advancedTemplates.length}）`);
    }
    
    // 检查是否需要加载高级模板（新增）
    const hasAdvancedTemplates = existingTemplates.some(t => 
      t.tags?.includes('2024') || t.name?.includes('DAN 13.0')
    );
    
    if (!hasAdvancedTemplates && existingTemplates.length > 0) {
      console.log('加载高级越狱模板...');
      let addedCount = 0;
      
      for (const template of advancedTemplates) {
        // 检查是否已存在同名模板
        const exists = existingTemplates.some(t => t.name === template.name);
        if (!exists) {
          await dbService.addTemplate(template);
          addedCount++;
        }
      }
      
      if (addedCount > 0) {
        console.log(`成功加载 ${addedCount} 个高级模板`);
      }
    }

    // 确保有默认的API配置
    const apiConfigs = await dbService.getApiConfigs();
    if (apiConfigs.length === 0) {
      await dbService.saveApiConfig({
        name: 'Kimi K2 默认配置',
        provider: 'moonshot',
        endpoint: 'https://api.moonshot.cn/v1/chat/completions',
        apiKey: '', // 用户需要自己填写
        model: 'kimi-k2-0711-preview',
        maxTokens: 4096,
        temperature: 0.7,
        isDefault: true,
      });
      console.log('创建默认API配置');
    }

    // 加载自定义变量到生成器
    const customVarCount = await loadCustomVariablesToGenerator();
    console.log(`加载了 ${customVarCount} 个自定义变量到生成器`);

    // 自动迁移现有模板的变量配置
    await migrateTemplateVariables();

    return true;
  } catch (error) {
    console.error('应用初始化失败:', error);
    return false;
  }
};

// 自动迁移模板变量配置
const migrateTemplateVariables = async () => {
  try {
    const templates = await dbService.getAllTemplates();
    let migratedCount = 0;
    
    for (const template of templates) {
      // 跳过已经配置的模板
      if (template.templateVariables?.global || template.templateVariables?.private) {
        continue;
      }
      
      // 使用智能检测函数检测变量
      const detectedVarNames = detectTemplateVariables(template.template);
      const detectedVars = new Set(detectedVarNames);
      
      if (detectedVars.size === 0) continue;
      
      // 自动分类变量
      const globalVars: string[] = [];
      const privateVars: Record<string, string[]> = {};
      
      detectedVars.forEach(varName => {
        if (variableDataGenerator.hasVariable(varName)) {
          globalVars.push(varName);
        } else {
          // 私有变量，提供默认值
          privateVars[varName] = [`示例${varName}值`];
        }
      });
      
      // 更新模板
      await dbService.updateTemplate(template.id!, {
        ...template,
        templateVariables: {
          global: globalVars.length > 0 ? globalVars : undefined,
          private: Object.keys(privateVars).length > 0 ? privateVars : undefined
        }
      });
      
      migratedCount++;
    }
    
    if (migratedCount > 0) {
      console.log(`成功迁移 ${migratedCount} 个模板的变量配置`);
    }
  } catch (error) {
    console.error('模板变量迁移失败:', error);
  }
};

export const resetApp = async () => {
  if (confirm('确定要重置应用吗？这将删除所有数据并重新加载初始模板。')) {
    await dbService.clearAllData();
    await initializeApp();
    window.location.reload();
  }
};