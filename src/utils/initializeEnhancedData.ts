import { dbService } from '../lib/db';
import enhancedTemplates from '../data/enhancedTemplates';
import type { TestTemplate } from '../types';

/**
 * 初始化增强数据
 * 将增强的模板添加到数据库中
 */
export async function initializeEnhancedData(): Promise<void> {
  try {
    console.log('开始初始化增强数据...');
    
    // 获取现有模板
    const existingTemplates = await dbService.getAllTemplates();
    const existingNames = new Set(existingTemplates.map(t => t.name));
    
    // 准备要添加的增强模板
    const templatesToAdd: TestTemplate[] = [];
    
    for (const template of enhancedTemplates) {
      // 检查是否已存在同名模板
      if (!existingNames.has(template.name)) {
        const newTemplate: TestTemplate = {
          ...template,
          createdAt: new Date(),
          lastUpdated: new Date()
        };
        templatesToAdd.push(newTemplate);
      }
    }
    
    // 批量添加新模板
    if (templatesToAdd.length > 0) {
      for (const template of templatesToAdd) {
        await dbService.addTemplate(template);
      }
      console.log(`成功添加 ${templatesToAdd.length} 个增强模板`);
    } else {
      console.log('所有增强模板已存在，无需添加');
    }
    
    // 更新现有模板的成功判定关键字（如果需要）
    const templatesNeedingUpdate = existingTemplates.filter(existing => {
      const enhanced = enhancedTemplates.find(e => e.name === existing.name);
      if (enhanced && enhanced.successCriteria.keywords) {
        const existingKeywords = existing.successCriteria.keywords || [];
        const enhancedKeywords = enhanced.successCriteria.keywords;
        // 检查是否有新的关键字
        return enhancedKeywords.some(k => !existingKeywords.includes(k));
      }
      return false;
    });
    
    for (const template of templatesNeedingUpdate) {
      const enhanced = enhancedTemplates.find(e => e.name === template.name);
      if (enhanced && enhanced.successCriteria.keywords) {
        // 合并关键字
        const mergedKeywords = [
          ...new Set([
            ...(template.successCriteria.keywords || []),
            ...enhanced.successCriteria.keywords
          ])
        ];
        
        template.successCriteria.keywords = mergedKeywords;
        template.lastUpdated = new Date();
        await dbService.updateTemplate(template.id!, template);
      }
    }
    
    if (templatesNeedingUpdate.length > 0) {
      console.log(`更新了 ${templatesNeedingUpdate.length} 个模板的成功判定关键字`);
    }
    
    console.log('增强数据初始化完成');
  } catch (error) {
    console.error('初始化增强数据时出错:', error);
  }
}

/**
 * 检查是否需要初始化增强数据
 */
export async function checkAndInitializeEnhancedData(): Promise<void> {
  try {
    // 检查是否已经初始化过（通过检查特定的增强模板是否存在）
    const templates = await dbService.getAllTemplates();
    const hasEnhancedTemplate = templates.some(t => 
      t.name.includes('DAN 15.0') || 
      t.name.includes('开发者后门') ||
      t.name.includes('多重逻辑悖论')
    );
    
    if (!hasEnhancedTemplate) {
      await initializeEnhancedData();
    } else {
      console.log('增强数据已存在，跳过初始化');
    }
  } catch (error) {
    console.error('检查增强数据时出错:', error);
  }
}