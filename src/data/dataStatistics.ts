/**
 * 数据统计 - 展示增强后的数据规模
 */

import { enhancedVariableData } from './enhancedVariables';
import enhancedTemplates from './enhancedTemplates';
import initialTemplates from './initialTemplates';
import advancedTemplates from './advancedTemplates';

export function getDataStatistics() {
  // 变量统计
  const variableStats = Object.entries(enhancedVariableData).map(([key, values]) => ({
    name: key,
    count: values.length
  }));
  
  const totalVariableValues = variableStats.reduce((sum, v) => sum + v.count, 0);
  
  // 模板统计
  const templateStats = {
    initial: initialTemplates.length,
    advanced: advancedTemplates.length,
    enhanced: enhancedTemplates.length,
    total: initialTemplates.length + advancedTemplates.length + enhancedTemplates.length
  };
  
  // 分类统计
  const allTemplates = [...initialTemplates, ...advancedTemplates, ...enhancedTemplates];
  const categoryStats = allTemplates.reduce((acc, template) => {
    const category = template.category;
    if (!acc[category]) {
      acc[category] = {
        count: 0,
        subcategories: new Set()
      };
    }
    acc[category].count++;
    acc[category].subcategories.add(template.subcategory);
    return acc;
  }, {} as Record<string, { count: number; subcategories: Set<string> }>);
  
  // 风险等级统计
  const riskStats = allTemplates.reduce((acc, template) => {
    const risk = template.riskLevel;
    acc[risk] = (acc[risk] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    variables: {
      totalTypes: variableStats.length,
      totalValues: totalVariableValues,
      averageValuesPerType: Math.round(totalVariableValues / variableStats.length),
      details: variableStats.sort((a, b) => b.count - a.count)
    },
    templates: templateStats,
    categories: Object.entries(categoryStats).map(([cat, data]) => ({
      name: cat,
      templateCount: data.count,
      subcategoryCount: data.subcategories.size
    })),
    riskLevels: riskStats,
    summary: {
      totalTemplates: templateStats.total,
      totalVariableTypes: variableStats.length,
      totalVariableValues: totalVariableValues,
      averageVariablesPerTemplate: Math.round(
        allTemplates.reduce((sum, t) => sum + (t.variables?.length || 0), 0) / allTemplates.length
      )
    }
  };
}

export function printDataStatistics() {
  const stats = getDataStatistics();
  
  console.log('='.repeat(60));
  console.log('📊 Prompt Security Tester - 数据统计报告');
  console.log('='.repeat(60));
  
  console.log('\n📝 模板统计:');
  console.log(`  • 初始模板: ${stats.templates.initial} 个`);
  console.log(`  • 高级模板: ${stats.templates.advanced} 个`);
  console.log(`  • 增强模板: ${stats.templates.enhanced} 个`);
  console.log(`  • 总计: ${stats.templates.total} 个`);
  
  console.log('\n🔤 变量统计:');
  console.log(`  • 变量类型: ${stats.variables.totalTypes} 种`);
  console.log(`  • 枚举值总数: ${stats.variables.totalValues} 个`);
  console.log(`  • 平均每类: ${stats.variables.averageValuesPerType} 个值`);
  
  console.log('\n📂 类别分布:');
  stats.categories.forEach(cat => {
    console.log(`  • ${cat.name}: ${cat.templateCount} 个模板, ${cat.subcategoryCount} 个子类`);
  });
  
  console.log('\n⚠️ 风险等级分布:');
  Object.entries(stats.riskLevels).forEach(([level, count]) => {
    const emoji = level === 'critical' ? '🔴' : level === 'high' ? '🟠' : level === 'medium' ? '🟡' : '🟢';
    console.log(`  ${emoji} ${level}: ${count} 个模板`);
  });
  
  console.log('\n📈 增强效果:');
  console.log(`  • 模板数量提升: +${stats.templates.enhanced} 个 (+${Math.round(stats.templates.enhanced / (stats.templates.initial + stats.templates.advanced) * 100)}%)`);
  console.log(`  • 变量值丰富度: 平均每个变量 ${stats.variables.averageValuesPerType} 个枚举值`);
  console.log(`  • 覆盖攻击类型: ${stats.categories.length} 大类`);
  
  console.log('\n💪 核心能力提升:');
  console.log('  ✅ 更强的prompt jailbreak效果');
  console.log('  ✅ 更丰富的变量枚举值');
  console.log('  ✅ 更准确的成功判定');
  console.log('  ✅ 更全面的攻击覆盖');
  
  console.log('\n='.repeat(60));
  
  return stats;
}