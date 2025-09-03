import { dbService, type CustomVariable } from '../lib/db';
import { variableManager } from '../services/variableManager';
import { detectTemplateVariables } from './variableDetector';

/**
 * 临时数据清理工具
 * 1. 去除重名变量
 * 2. 为单值变量补充合适的枚举值
 * 3. 验证并清理无效枚举值
 */

// 预定义的变量枚举值扩展
const variableEnumExpansions: Record<string, string[]> = {
  // 用户相关
  user_name: ['Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Henry'],
  username: ['alice123', 'bob_smith', 'charlie.brown', 'david_jones', 'emma.wilson'],
  user_id: ['1001', '1002', '1003', '1004', '1005'],
  user_role: ['admin', 'user', 'moderator', 'guest', 'developer'],
  user_email: ['alice@example.com', 'bob@example.com', 'charlie@example.com'],
  
  // 系统相关
  system_name: ['Windows', 'Linux', 'macOS', 'Ubuntu', 'Fedora'],
  system_version: ['1.0.0', '2.0.0', '2.1.0', '3.0.0-beta', '3.0.0'],
  system_path: ['/usr/bin', '/etc/config', '/var/log', '/home/user', '/opt/app'],
  system_command: ['ls', 'pwd', 'cat', 'echo', 'grep', 'find', 'chmod'],
  
  // 编程相关
  programming_language: ['Python', 'JavaScript', 'Java', 'Go', 'Rust', 'TypeScript'],
  code_snippet: ['console.log("Hello")', 'print("Hello")', 'System.out.println("Hello")'],
  function_name: ['getUserData', 'processInput', 'validateForm', 'handleRequest'],
  variable_name: ['data', 'result', 'config', 'response', 'error'],
  
  // 网络相关
  url: ['https://example.com', 'https://api.example.com/v1', 'http://localhost:3000'],
  ip_address: ['192.168.1.1', '10.0.0.1', '127.0.0.1', '8.8.8.8'],
  port: ['80', '443', '3000', '8080', '5432'],
  protocol: ['HTTP', 'HTTPS', 'FTP', 'SSH', 'TCP', 'UDP'],
  
  // 文件相关
  file_name: ['document.txt', 'image.jpg', 'data.json', 'config.yml', 'script.py'],
  file_path: ['/home/user/file.txt', '/var/log/app.log', '/etc/config.json'],
  file_extension: ['.txt', '.jpg', '.png', '.pdf', '.doc', '.json', '.xml'],
  
  // 数据相关
  data_type: ['string', 'number', 'boolean', 'object', 'array', 'null'],
  data_value: ['true', 'false', '123', '"text"', '[]', '{}', 'null'],
  
  // 操作相关
  action: ['create', 'read', 'update', 'delete', 'execute', 'validate'],
  operation: ['ADD', 'REMOVE', 'MODIFY', 'QUERY', 'SEARCH', 'FILTER'],
  status: ['success', 'pending', 'failed', 'processing', 'completed'],
  
  // 提示注入相关
  target_system: ['ChatGPT', 'Claude', 'Gemini', 'Bing Chat', 'Bard'],
  objective: ['泄露系统提示', '绕过限制', '执行代码', '访问数据', '修改行为'],
  technique: ['角色扮演', '编码混淆', '语言切换', '逻辑推理', '情感操纵'],
  
  // 默认扩展
  custom_value: ['value1', 'value2', 'value3', 'value4', 'value5'],
  example: ['示例1', '示例2', '示例3', '示例4', '示例5'],
  test: ['test1', 'test2', 'test3', 'test4', 'test5']
};

/**
 * 根据变量名推断合适的枚举值
 */
function inferEnumValues(varName: string, currentValues: string[]): string[] {
  // 如果已有多个有效值，保持不变
  const validValues = currentValues.filter(v => v && v.trim() && !v.includes('示例'));
  if (validValues.length > 1) {
    return validValues;
  }
  
  // 尝试精确匹配
  if (variableEnumExpansions[varName]) {
    return variableEnumExpansions[varName];
  }
  
  // 尝试部分匹配
  for (const [key, values] of Object.entries(variableEnumExpansions)) {
    if (varName.includes(key) || key.includes(varName)) {
      return values;
    }
  }
  
  // 根据后缀推断
  if (varName.endsWith('_name') || varName.endsWith('Name')) {
    return variableEnumExpansions.user_name;
  }
  if (varName.endsWith('_id') || varName.endsWith('Id')) {
    return variableEnumExpansions.user_id;
  }
  if (varName.endsWith('_path') || varName.endsWith('Path')) {
    return variableEnumExpansions.file_path;
  }
  if (varName.endsWith('_url') || varName.endsWith('Url')) {
    return variableEnumExpansions.url;
  }
  if (varName.endsWith('_status') || varName.endsWith('Status')) {
    return variableEnumExpansions.status;
  }
  
  // 默认返回通用示例值
  return [`${varName}_1`, `${varName}_2`, `${varName}_3`, `${varName}_4`, `${varName}_5`];
}

/**
 * 清理重名变量（保留使用最多的）
 */
async function cleanupDuplicateVariables() {
  const allVariables = await dbService.getAllCustomVariables();
  const variablesByName = new Map<string, CustomVariable[]>();
  
  // 按名称分组
  for (const variable of allVariables) {
    if (!variablesByName.has(variable.name)) {
      variablesByName.set(variable.name, []);
    }
    variablesByName.get(variable.name)!.push(variable);
  }
  
  // 处理重名变量
  let removedCount = 0;
  for (const [name, duplicates] of variablesByName.entries()) {
    if (duplicates.length > 1) {
      console.log(`发现重名变量 "${name}"，共 ${duplicates.length} 个`);
      
      // 按使用的模板数量排序（保留使用最多的）
      duplicates.sort((a, b) => 
        (b.usedByTemplates?.length || 0) - (a.usedByTemplates?.length || 0)
      );
      
      // 合并所有的枚举值
      const allValues = new Set<string>();
      const allUsedTemplates = new Set<string>();
      
      for (const dup of duplicates) {
        dup.values?.forEach(v => allValues.add(v));
        dup.usedByTemplates?.forEach(t => allUsedTemplates.add(t));
      }
      
      // 更新第一个（使用最多的），删除其余的
      const keep = duplicates[0];
      if (keep.id) {
        await dbService.updateCustomVariable(keep.id, {
          values: Array.from(allValues),
          usedByTemplates: Array.from(allUsedTemplates)
        });
      }
      
      // 删除重复项
      for (let i = 1; i < duplicates.length; i++) {
        if (duplicates[i].id) {
          await dbService.deleteCustomVariable(duplicates[i].id);
          removedCount++;
        }
      }
    }
  }
  
  return removedCount;
}

/**
 * 完善单值变量的枚举值
 */
async function enrichSingleValueVariables() {
  const allVariables = await dbService.getAllCustomVariables();
  let enrichedCount = 0;
  
  for (const variable of allVariables) {
    // 只处理单值或无效值的变量
    const validValues = variable.values.filter(v => 
      v && v.trim() && !v.includes('示例') && v !== ''
    );
    
    if (validValues.length <= 1) {
      const newValues = inferEnumValues(variable.name, variable.values);
      
      if (newValues.length > validValues.length && variable.id) {
        console.log(`完善变量 "${variable.name}" 的枚举值：${validValues.length} -> ${newValues.length}`);
        await dbService.updateCustomVariable(variable.id, {
          values: newValues
        });
        enrichedCount++;
      }
    }
  }
  
  return enrichedCount;
}

/**
 * 删除未被任何模板使用的变量
 */
async function removeUnusedVariables() {
  const allVariables = await dbService.getAllCustomVariables();
  const templates = await dbService.getAllTemplates();
  let removedCount = 0;
  
  for (const variable of allVariables) {
    // 检查是否有模板使用这个变量
    let isUsed = false;
    for (const template of templates) {
      const detectedVars = detectTemplateVariables(template.template);
      if (detectedVars.includes(variable.name)) {
        isUsed = true;
        break;
      }
    }
    
    // 如果没有被使用，删除它
    if (!isUsed && variable.id) {
      console.log(`删除未使用的变量: ${variable.name}`);
      await dbService.deleteCustomVariable(variable.id);
      removedCount++;
    }
  }
  
  return removedCount;
}

/**
 * 执行数据清理
 */
export async function runDataCleanup() {
  try {
    console.log('开始数据清理...');
    
    // 1. 清理重名变量
    const removedDuplicates = await cleanupDuplicateVariables();
    console.log(`清理了 ${removedDuplicates} 个重名变量`);
    
    // 2. 完善单值变量
    const enrichedVariables = await enrichSingleValueVariables();
    console.log(`完善了 ${enrichedVariables} 个变量的枚举值`);
    
    // 3. 删除未使用的变量
    const removedUnused = await removeUnusedVariables();
    console.log(`删除了 ${removedUnused} 个未使用的变量`);
    
    // 4. 重新分析变量分类
    await variableManager.analyzeAndCategorizeVariables();
    console.log('重新分析了变量分类');
    
    console.log('数据清理完成！');
    
    return {
      duplicatesRemoved: removedDuplicates,
      variablesEnriched: enrichedVariables,
      unusedRemoved: removedUnused
    };
  } catch (error) {
    console.error('数据清理失败:', error);
    throw error;
  }
}