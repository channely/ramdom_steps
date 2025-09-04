import { dbService } from '../lib/db';
import { generateVariableValues } from './variableValueGenerator';

/**
 * 专门修复指定的变量
 */
export async function fixSpecificVariables(): Promise<{
  fixed: number;
  details: Array<{
    name: string;
    oldValues: string[];
    newValues: string[];
  }>;
}> {
  console.log('\n=== 修复特定变量的枚举值 ===\n');
  
  // 需要修复的特定变量列表
  const targetVariables = [
    'evaluation_aspect',
    'genre', 
    'resource_type',
    'purpose',
    'comparison_baseline',
    'thesis_title'
  ];
  
  let fixedCount = 0;
  const details: Array<{
    name: string;
    oldValues: string[];
    newValues: string[];
  }> = [];
  
  const allVariables = await dbService.getAllCustomVariables();
  
  for (const varName of targetVariables) {
    const variable = allVariables.find(v => v.name === varName);
    
    if (!variable) {
      console.log(`⚠️ 变量 ${varName} 不存在，跳过`);
      continue;
    }
    
    // 检查是否需要修复（值是否是 xxx_1 格式）
    const needsFix = variable.values?.some(v => /^.+_\d+$/.test(v)) || 
                    variable.values?.length === 0;
    
    if (needsFix) {
      console.log(`\n🔧 修复变量: ${varName}`);
      console.log(`   当前值: ${variable.values?.join(', ') || '(空)'}`);
      
      const oldValues = [...(variable.values || [])];
      const newValues = generateVariableValues(varName);
      
      if (newValues.length > 0 && variable.id) {
        await dbService.updateCustomVariable(variable.id, {
          values: newValues
        });
        
        fixedCount++;
        details.push({
          name: varName,
          oldValues,
          newValues
        });
        
        console.log(`   ✅ 新值: ${newValues.join(', ')}`);
      } else {
        console.log(`   ❌ 无法生成新值`);
      }
    } else {
      console.log(`✓ 变量 ${varName} 的值已经是合理的`);
    }
  }
  
  console.log('\n=== 修复完成 ===');
  console.log(`总计修复了 ${fixedCount} 个变量`);
  
  return { fixed: fixedCount, details };
}

/**
 * 立即运行特定变量修复
 */
export async function runSpecificVariablesFix(): Promise<void> {
  try {
    const result = await fixSpecificVariables();
    
    if (result.fixed > 0) {
      console.log('\n📊 修复详情：');
      result.details.forEach(({ name, oldValues, newValues }) => {
        console.log(`\n变量: ${name}`);
        console.log(`  旧值: [${oldValues.join(', ')}]`);
        console.log(`  新值: [${newValues.join(', ')}]`);
      });
      
      console.log(`\n✅ 成功修复了 ${result.fixed} 个特定变量！`);
    } else {
      console.log('✅ 所有特定变量的枚举值都是合理的。');
    }
  } catch (error) {
    console.error('❌ 修复特定变量时出错:', error);
  }
}