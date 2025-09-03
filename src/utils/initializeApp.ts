import { dbService } from '../lib/db';
import initialTemplates from '../data/initialTemplates';

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
      
      console.log(`成功加载 ${initialTemplates.length} 个初始模板`);
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

    return true;
  } catch (error) {
    console.error('应用初始化失败:', error);
    return false;
  }
};

export const resetApp = async () => {
  if (confirm('确定要重置应用吗？这将删除所有数据并重新加载初始模板。')) {
    await dbService.clearAllData();
    await initializeApp();
    window.location.reload();
  }
};