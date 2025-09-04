import { fixUnreasonableVariableValues } from './variableValueGenerator';

/**
 * 执行变量值修复
 * 将在应用启动时自动运行
 */
export async function runVariableValueFix(): Promise<void> {
  try {
    console.log('=== 开始检查和修复不合理的变量枚举值 ===');
    
    const result = await fixUnreasonableVariableValues();
    
    if (result.fixed > 0) {
      console.log(`✅ 成功修复了 ${result.fixed} 个变量的枚举值`);
      console.log('\n修复详情：');
      
      result.details.forEach(({ name, oldValues, newValues }) => {
        console.log(`\n📝 变量: ${name}`);
        console.log(`   旧值: ${oldValues.join(', ')}`);
        console.log(`   新值: ${newValues.join(', ')}`);
      });
    } else {
      console.log('✅ 所有变量的枚举值都是合理的，无需修复');
    }
    
    console.log('=== 变量值修复完成 ===\n');
  } catch (error) {
    console.error('❌ 修复变量值时出错:', error);
  }
}