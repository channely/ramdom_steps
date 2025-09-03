/**
 * 智能检测模板中的变量，排除JSON语法等误识别情况
 */
export function detectTemplateVariables(template: string): string[] {
  const variablePattern = /\{([^}]+)\}/g;
  const detectedVars = new Set<string>();
  let match;

  while ((match = variablePattern.exec(template)) !== null) {
    const content = match[1];
    const fullMatch = match[0];
    const startIndex = match.index;
    
    // 过滤规则：排除JSON语法
    if (isValidVariable(content, template, startIndex, fullMatch)) {
      detectedVars.add(content);
    }
  }

  return Array.from(detectedVars);
}

/**
 * 判断是否为有效的变量（而非JSON语法等）
 */
function isValidVariable(content: string, fullTemplate: string, startIndex: number, fullMatch: string): boolean {
  // 1. 排除空内容
  if (!content || content.trim() === '') {
    return false;
  }

  // 2. 排除JSON对象语法（包含冒号、逗号、引号等）
  if (/[":,\[\]\{\}]/.test(content)) {
    return false;
  }

  // 3. 排除数字（纯数字不太可能是变量名）
  if (/^\d+$/.test(content)) {
    return false;
  }

  // 4. 检查上下文是否在JSON结构内
  const beforeText = fullTemplate.substring(Math.max(0, startIndex - 100), startIndex);
  const afterText = fullTemplate.substring(startIndex + fullMatch.length, Math.min(fullTemplate.length, startIndex + fullMatch.length + 100));
  
  // 检查是否在JSON字符串内（被引号包围）
  const quoteBefore = (beforeText.match(/"/g) || []).length;
  const quoteAfter = (afterText.match(/"/g) || []).length;
  
  // 如果前后引号数都是奇数，说明可能在字符串内
  if (quoteBefore % 2 === 1 && quoteAfter % 2 === 1) {
    // 但如果变量名符合标准格式，仍然认为是有效变量
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(content)) {
      return false;
    }
  }

  // 5. 检查是否紧邻JSON语法符号
  const charBefore = fullTemplate[startIndex - 1];
  const charAfter = fullTemplate[startIndex + fullMatch.length];
  
  // 如果紧邻冒号、逗号等JSON符号，可能是JSON结构
  if (charBefore === ':' || charAfter === ':' || charBefore === ',' || charAfter === ',') {
    // 但如果变量名是标准格式，仍然保留
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(content)) {
      return false;
    }
  }

  // 6. 排除包含特殊字符的内容（除了下划线）
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(content)) {
    return false;
  }

  // 7. 变量名长度限制（太长可能不是变量）
  if (content.length > 50) {
    return false;
  }

  return true;
}

/**
 * 获取变量在模板中的所有位置
 */
export function getVariablePositions(template: string, variableName: string): number[] {
  const positions: number[] = [];
  const pattern = new RegExp(`\\{${variableName}\\}`, 'g');
  let match;

  while ((match = pattern.exec(template)) !== null) {
    // 验证这个位置的变量是有效的
    if (isValidVariable(variableName, template, match.index, match[0])) {
      positions.push(match.index);
    }
  }

  return positions;
}