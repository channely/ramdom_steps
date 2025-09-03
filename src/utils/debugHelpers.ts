import { db, dbService } from '../lib/db';

// 调试辅助函数
export const debugHelpers = {
  // 查看所有API配置
  async viewAllApiConfigs() {
    const configs = await dbService.getApiConfigs();
    console.log('所有API配置:', configs);
    return configs;
  },

  // 清理并重置API配置
  async resetApiConfigs() {
    // 清除所有配置
    await db.apiConfigs.clear();
    console.log('已清除所有API配置');
    
    // 创建默认配置
    const defaultConfig = {
      name: 'Kimi K2 默认配置',
      provider: 'moonshot' as const,
      endpoint: 'https://api.moonshot.cn/v1/chat/completions',
      apiKey: 'sk-KUUvvvlJ13yJiSKSeNSVtrSAMVMwdVZkamkeTDnDQceFiojq',
      model: 'kimi-k2-0711-preview',
      maxTokens: 4096,
      temperature: 0.7,
      isDefault: true,
    };
    
    await dbService.saveApiConfig(defaultConfig);
    console.log('已创建默认配置');
    
    const newConfig = await dbService.getDefaultApiConfig();
    console.log('新的默认配置:', newConfig);
    return newConfig;
  },

  // 手动设置API密钥
  async setApiKey(apiKey: string) {
    const configs = await dbService.getApiConfigs();
    if (configs.length === 0) {
      // 如果没有配置，创建一个
      await dbService.saveApiConfig({
        name: 'Manual Config',
        provider: 'moonshot',
        endpoint: 'https://api.moonshot.cn/v1/chat/completions',
        apiKey: apiKey,
        model: 'kimi-k2-0711-preview',
        maxTokens: 4096,
        temperature: 0.7,
        isDefault: true,
      });
    } else {
      // 更新第一个配置
      const firstConfig = configs[0];
      await dbService.updateApiConfig(firstConfig.id!, {
        apiKey: apiKey,
        isDefault: true,
      });
    }
    const updated = await dbService.getDefaultApiConfig();
    console.log('更新后的配置:', updated);
    return updated;
  }
};

// 将调试函数暴露到全局，方便在浏览器控制台使用
if (typeof window !== 'undefined') {
  (window as any).debugHelpers = debugHelpers;
  console.log('调试辅助函数已加载，使用 debugHelpers.xxx() 调用');
}