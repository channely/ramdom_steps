import { dbService } from '../lib/db';
import { variableDataGenerator } from '../services/variableDataGenerator';

/**
 * 加载所有自定义变量到 variableDataGenerator
 * 应该在应用启动时调用
 */
export async function loadCustomVariablesToGenerator() {
  try {
    const customVariables = await dbService.getAllCustomVariables();
    
    customVariables.forEach(variable => {
      if (variable.name && variable.values && variable.values.length > 0) {
        variableDataGenerator.addVariableData(variable.name, variable.values);
        console.log(`[Init] 已加载自定义变量: ${variable.name} (${variable.values.length} 个值)`);
      }
    });
    
    console.log(`[Init] 共加载 ${customVariables.length} 个自定义变量`);
    return customVariables.length;
  } catch (error) {
    console.error('[Init] 加载自定义变量失败:', error);
    return 0;
  }
}