import { dbService } from '../lib/db';

/**
 * 立即检查并显示所有需要修复的变量
 */
export async function immediateVariableCheck(): Promise<void> {
  console.log('\n=== 立即检查变量枚举值 ===\n');
  
  try {
    const allVariables = await dbService.getAllCustomVariables();
    const pattern = /^(.+)_(\d)$/;
    const problematicVariables: Array<{
      name: string;
      values: string[];
      scope: string;
    }> = [];
    
    for (const variable of allVariables) {
      if (!variable.values || variable.values.length === 0) continue;
      
      // 检查是否所有值都符合 xxx_数字 的模式
      const allEndWithNumber = variable.values.every(value => pattern.test(value));
      
      if (allEndWithNumber) {
        problematicVariables.push({
          name: variable.name,
          values: variable.values,
          scope: variable.scope || 'unknown'
        });
      }
    }
    
    if (problematicVariables.length > 0) {
      console.log(`❌ 发现 ${problematicVariables.length} 个需要修复的变量：\n`);
      
      problematicVariables.forEach((v, index) => {
        console.log(`${index + 1}. ${v.name} (${v.scope})`);
        console.log(`   当前值: [${v.values.join(', ')}]`);
        console.log('');
      });
      
      console.log('请点击"严格检查修复"按钮来修复这些变量。');
    } else {
      console.log('✅ 所有变量的枚举值都是合理的！');
    }
    
    // 统计信息
    const totalVars = allVariables.length;
    const emptyVars = allVariables.filter(v => !v.values || v.values.length === 0).length;
    const validVars = totalVars - problematicVariables.length - emptyVars;
    
    console.log('\n📊 统计信息：');
    console.log(`   总变量数: ${totalVars}`);
    console.log(`   合理变量: ${validVars}`);
    console.log(`   需要修复: ${problematicVariables.length}`);
    console.log(`   空值变量: ${emptyVars}`);
    
  } catch (error) {
    console.error('检查失败:', error);
  }
  
  console.log('\n=== 检查完成 ===\n');
}