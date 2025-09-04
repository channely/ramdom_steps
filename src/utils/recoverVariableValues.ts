import { dbService } from '../lib/db';

/**
 * 恢复被错误覆盖的变量值
 * 专门用于修复那些值变成了 xxx_实例A 格式的变量
 */
export async function recoverVariableValues(): Promise<{
  needsManualFix: string[];
  details: Array<{
    name: string;
    currentValues: string[];
    needsUserInput: boolean;
  }>;
}> {
  console.log('\n=== 检查需要恢复的变量值 ===\n');
  
  const allVariables = await dbService.getAllCustomVariables();
  const needsManualFix: string[] = [];
  const details: Array<{
    name: string;
    currentValues: string[];
    needsUserInput: boolean;
  }> = [];
  
  for (const variable of allVariables) {
    if (!variable.values || variable.values.length === 0) continue;
    
    // 检查是否包含自动生成的值（xxx_实例A 格式）
    const hasGenericValues = variable.values.some(v => 
      v.includes('_实例') || 
      /^[a-zA-Z_]+_实例[A-Z]$/.test(v)
    );
    
    if (hasGenericValues) {
      needsManualFix.push(variable.name);
      details.push({
        name: variable.name,
        currentValues: variable.values,
        needsUserInput: true
      });
      
      console.log(`⚠️ 变量 ${variable.name} 需要恢复:`);
      console.log(`   当前值: ${variable.values.join(', ')}`);
      console.log(`   建议: 请在模板编辑器中重新输入正确的值`);
    }
  }
  
  if (needsManualFix.length > 0) {
    console.log(`\n❌ 发现 ${needsManualFix.length} 个变量的值需要恢复`);
    console.log('请编辑相应的模板，重新输入这些变量的正确值：');
    needsManualFix.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });
  } else {
    console.log('✅ 所有变量值都是正常的');
  }
  
  return { needsManualFix, details };
}

/**
 * 从模板中恢复变量值
 * 尝试从模板的 templateVariables 中恢复私有变量的值
 */
export async function recoverFromTemplates(): Promise<void> {
  console.log('\n=== 尝试从模板中恢复变量值 ===\n');
  
  const allTemplates = await dbService.getAllTemplates();
  const recoveredCount = new Map<string, string[]>();
  
  for (const template of allTemplates) {
    if (template.templateVariables?.private) {
      for (const [varName, values] of Object.entries(template.templateVariables.private)) {
        if (values && values.length > 0) {
          const validValues = values.filter((v: string) => 
            v && v.trim() && !v.includes('_实例')
          );
          
          if (validValues.length > 0) {
            if (!recoveredCount.has(varName)) {
              recoveredCount.set(varName, []);
            }
            recoveredCount.get(varName)!.push(...validValues);
          }
        }
      }
    }
  }
  
  // 更新数据库中的变量值
  for (const [varName, values] of recoveredCount) {
    const uniqueValues = [...new Set(values)];
    const allVariables = await dbService.getAllCustomVariables();
    const variable = allVariables.find(v => v.name === varName);
    
    if (variable && variable.id) {
      // 检查当前值是否是自动生成的
      const hasGenericValues = variable.values?.some(v => 
        v.includes('_实例') || /^[a-zA-Z_]+_实例[A-Z]$/.test(v)
      );
      
      if (hasGenericValues) {
        await dbService.updateCustomVariable(variable.id, {
          values: uniqueValues
        });
        console.log(`✅ 恢复了变量 ${varName} 的值:`, uniqueValues);
      }
    }
  }
  
  console.log('\n=== 恢复完成 ===\n');
}