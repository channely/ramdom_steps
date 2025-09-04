import { dbService } from '../lib/db';

/**
 * 清理和修复不合理的变量枚举值
 */
export async function cleanupVariableData(): Promise<void> {
  try {
    console.log('开始清理不合理的变量枚举值...');
    
    const allVariables = await dbService.getAllCustomVariables();
    let cleanedCount = 0;
    let emptyPrivateCount = 0;
    
    for (const variable of allVariables) {
      let needsUpdate = false;
      let newValues = variable.values || [];
      
      // 1. 检测并修复 "示例XXX值" 格式的不合理枚举值
      const hasPlaceholderValue = newValues.some(value => 
        value.startsWith('示例') && value.endsWith('值') ||
        value.match(/^示例.+值$/) ||
        value === `示例${variable.name}值`
      );
      
      if (hasPlaceholderValue) {
        console.log(`发现变量 ${variable.name} 包含占位符值: ${newValues.join(', ')}`);
        
        if (variable.scope === 'private') {
          // 私有变量清空占位符，让用户在模板编辑器中定义
          newValues = [];
          console.log(`  -> 清空私有变量占位符，等待用户定义`);
          needsUpdate = true;
          emptyPrivateCount++;
        } else {
          // 公共变量尝试生成合理的默认值
          newValues = generateReasonableDefaults(variable.name);
          console.log(`  -> 生成合理默认值: ${newValues.join(', ')}`);
          needsUpdate = true;
        }
      }
      
      // 2. 检测并修复其他格式的不合理值（如 xxx_1, xxx_2 等）
      const hasNumberedValue = newValues.some(value => 
        // 检测末尾是 _数字 的模式，但排除合理的情况（如 version_1, test_1 等）
        value.match(/^[a-zA-Z]+_\d+$/) && 
        !isReasonableNumberedValue(value)
      );
      
      if (hasNumberedValue && !needsUpdate) {
        console.log(`发现变量 ${variable.name} 包含编号格式值: ${newValues.join(', ')}`);
        
        // 为公共变量生成合理的默认值
        if (variable.scope === 'global') {
          newValues = generateReasonableDefaults(variable.name);
          console.log(`  -> 生成合理默认值替换`);
          needsUpdate = true;
        } else {
          // 私有变量清空，让用户定义
          newValues = [];
          console.log(`  -> 清空私有变量，等待用户定义`);
          needsUpdate = true;
        }
      }
      
      // 3. 更新变量
      if (needsUpdate && variable.id) {
        await dbService.updateCustomVariable(variable.id, { values: newValues });
        cleanedCount++;
      }
    }
    
    console.log(`清理完成：修复了 ${cleanedCount} 个变量`);
    if (emptyPrivateCount > 0) {
      console.log(`注意：${emptyPrivateCount} 个私有变量已清空，需要在模板编辑器中重新定义值`);
    }
    
  } catch (error) {
    console.error('清理变量数据时出错:', error);
  }
}

/**
 * 检查是否是合理的编号值
 */
function isReasonableNumberedValue(value: string): boolean {
  // 一些合理的编号模式
  const reasonablePatterns = [
    /^version_\d+$/,
    /^test_\d+$/,
    /^level_\d+$/,
    /^step_\d+$/,
    /^phase_\d+$/,
    /^stage_\d+$/,
    /^v\d+$/,
    /^superuser_\d+$/,  // 像 superuser_1 这种管理员名称是合理的
  ];
  
  return reasonablePatterns.some(pattern => pattern.test(value.toLowerCase()));
}

/**
 * 为变量生成合理的默认值
 */
function generateReasonableDefaults(varName: string): string[] {
  const nameLower = varName.toLowerCase();
  
  // 根据变量名推测合理的值
  if (nameLower.includes('action') || nameLower.includes('command')) {
    return ['执行操作', '运行命令', '处理请求', '完成任务'];
  }
  if (nameLower.includes('role') || nameLower.includes('user')) {
    return ['管理员', '用户', '访客', '开发者'];
  }
  if (nameLower.includes('type') || nameLower.includes('category')) {
    return ['类型A', '类型B', '类型C'];
  }
  if (nameLower.includes('status') || nameLower.includes('state')) {
    return ['启用', '禁用', '待定', '进行中'];
  }
  if (nameLower.includes('level')) {
    return ['低', '中', '高', '严重'];
  }
  if (nameLower.includes('mode')) {
    return ['正常模式', '调试模式', '测试模式'];
  }
  
  // 默认返回空数组，让用户定义
  return [];
}

/**
 * 在应用启动时自动运行清理
 */
export async function autoCleanupOnStartup(): Promise<void> {
  // 检查是否需要清理（通过查找不合理的值）
  const allVariables = await dbService.getAllCustomVariables();
  const needsCleanup = allVariables.some(v => 
    v.values?.some(value => 
      value.startsWith('示例') && value.endsWith('值') ||
      (value.match(/^[a-zA-Z]+_\d+$/) && !isReasonableNumberedValue(value))
    )
  );
  
  if (needsCleanup) {
    console.log('检测到不合理的变量值，开始自动清理...');
    await cleanupVariableData();
  }
}