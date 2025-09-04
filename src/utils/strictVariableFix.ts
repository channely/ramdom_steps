import { dbService } from '../lib/db';
import { generateVariableValues } from './variableValueGenerator';

/**
 * 严格检查变量的所有枚举值是否都以 _数字 结尾
 */
function checkAllValuesEndWithNumber(values: string[]): boolean {
  if (!values || values.length === 0) return false;
  
  // 检查是否所有值都符合 xxx_数字 的模式（数字是一位）
  const pattern = /^(.+)_(\d)$/;
  
  // 额外检查：如果值看起来像是自动生成的（包含"实例"），也需要修复
  const hasGenericValues = values.some(v => v.includes('_实例'));
  
  return values.every(value => pattern.test(value)) || hasGenericValues;
}

/**
 * 执行严格的变量值检查和修复
 * 只修复所有枚举值都是 _数字 结尾的变量
 */
export async function strictFixVariableValues(): Promise<{
  fixed: number;
  details: Array<{
    name: string;
    oldValues: string[];
    newValues: string[];
  }>;
}> {
  console.log('=== 开始严格检查变量枚举值 ===');
  
  const allVariables = await dbService.getAllCustomVariables();
  let fixedCount = 0;
  const details: Array<{
    name: string;
    oldValues: string[];
    newValues: string[];
  }> = [];
  
  for (const variable of allVariables) {
    if (!variable.values || variable.values.length === 0) {
      console.log(`跳过空变量: ${variable.name}`);
      continue;
    }
    
    // 严格检查：所有值都必须以 _数字 结尾
    if (checkAllValuesEndWithNumber(variable.values)) {
      console.log(`\n❌ 发现需要修复的变量: ${variable.name}`);
      console.log(`   当前值: ${variable.values.join(', ')}`);
      
      const oldValues = [...variable.values];
      let newValues = generateVariableValues(variable.name);
      
      // 如果生成器没有返回值，根据变量名生成默认值
      if (newValues.length === 0) {
        console.log(`   ⚠️ 生成器未返回值，使用默认生成策略`);
        newValues = generateDefaultValues(variable.name, variable.values.length);
      }
      
      // 确保新值数量不少于原值数量
      while (newValues.length < oldValues.length) {
        newValues.push(`${variable.name}_value_${newValues.length + 1}`);
      }
      
      // 更新数据库
      if (variable.id) {
        await dbService.updateCustomVariable(variable.id, {
          values: newValues
        });
        
        fixedCount++;
        details.push({
          name: variable.name,
          oldValues,
          newValues
        });
        
        console.log(`   ✅ 新值: ${newValues.join(', ')}`);
      }
    } else {
      console.log(`✓ 变量 ${variable.name} 的枚举值合理`);
    }
  }
  
  console.log('\n=== 严格检查完成 ===');
  console.log(`总计修复了 ${fixedCount} 个变量`);
  
  return { fixed: fixedCount, details };
}

/**
 * 生成默认的合理枚举值
 */
function generateDefaultValues(varName: string, count: number): string[] {
  const nameLower = varName.toLowerCase();
  const values: string[] = [];
  
  // 根据变量名的关键词生成合理的值
  if (nameLower.includes('name')) {
    const names = ['Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Henry'];
    for (let i = 0; i < Math.min(count, names.length); i++) {
      values.push(names[i]);
    }
  } else if (nameLower.includes('value') || nameLower.includes('data')) {
    const dataValues = ['高优先级数据', '中优先级数据', '低优先级数据', '紧急数据', '常规数据', '归档数据'];
    for (let i = 0; i < Math.min(count, dataValues.length); i++) {
      values.push(dataValues[i]);
    }
  } else if (nameLower.includes('option') || nameLower.includes('choice')) {
    const options = ['优选方案', '备选方案', '紧急方案', '默认选项', '自定义选项', '高级选项'];
    for (let i = 0; i < Math.min(count, options.length); i++) {
      values.push(options[i]);
    }
  } else if (nameLower.includes('config') || nameLower.includes('setting')) {
    const configs = ['默认配置', '生产配置', '测试配置', '开发配置', '调试配置', '优化配置'];
    for (let i = 0; i < Math.min(count, configs.length); i++) {
      values.push(configs[i]);
    }
  } else if (nameLower.includes('param') || nameLower.includes('arg')) {
    const params = ['必填参数', '可选参数', '默认参数', '扩展参数', '系统参数', '用户参数'];
    for (let i = 0; i < Math.min(count, params.length); i++) {
      values.push(params[i]);
    }
  } else {
    // 通用默认值
    const genericValues = [
      `${varName}_实例A`,
      `${varName}_实例B`,
      `${varName}_实例C`,
      `${varName}_实例D`,
      `${varName}_实例E`,
      `${varName}_实例F`
    ];
    for (let i = 0; i < Math.min(count, genericValues.length); i++) {
      values.push(genericValues[i]);
    }
  }
  
  // 如果生成的值不够，补充
  while (values.length < count) {
    values.push(`${varName}_补充值_${values.length + 1}`);
  }
  
  return values;
}

/**
 * 运行严格的变量值修复
 */
export async function runStrictVariableFix(): Promise<void> {
  try {
    const result = await strictFixVariableValues();
    
    if (result.fixed > 0) {
      console.log('\n📊 修复详情：');
      result.details.forEach(({ name, oldValues, newValues }) => {
        console.log(`\n变量: ${name}`);
        console.log(`  旧值: [${oldValues.join(', ')}]`);
        console.log(`  新值: [${newValues.join(', ')}]`);
      });
      
      console.log(`\n✅ 成功修复了 ${result.fixed} 个变量的不合理枚举值！`);
    } else {
      console.log('✅ 所有变量的枚举值都是合理的，无需修复。');
    }
  } catch (error) {
    console.error('❌ 严格修复变量值时出错:', error);
  }
}