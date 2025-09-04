/**
 * 根据变量名智能生成合理的枚举值
 */

interface VariablePattern {
  pattern: RegExp;
  values: string[];
}

// 定义变量名模式和对应的合理枚举值
const variablePatterns: VariablePattern[] = [
  // 人物/角色相关
  {
    pattern: /character|personality|persona/i,
    values: ['认真严谨的教授', '幽默风趣的主持人', '经验丰富的专家', '热心助人的志愿者', '理性客观的分析师']
  },
  {
    pattern: /role_play|role|actor/i,
    values: ['系统管理员', '技术专家', '数据分析师', '产品经理', '安全顾问', '研究员', '开发工程师']
  },
  {
    pattern: /ai_name|assistant_name|bot_name/i,
    values: ['AlphaAssist', 'TechBot', 'DataMind', 'InfoHelper', 'SmartAgent', 'KnowledgeBot']
  },
  {
    pattern: /username|user_name|user/i,
    values: ['admin', 'developer', 'analyst', 'researcher', 'engineer', 'scientist']
  },
  
  // 动作/指令相关
  {
    pattern: /action|command|operation|task/i,
    values: ['分析数据', '生成报告', '执行计算', '处理请求', '优化算法', '验证结果', '整理信息']
  },
  {
    pattern: /target_action|malicious_action/i,
    values: ['访问敏感数据', '执行系统命令', '绕过安全限制', '修改配置', '提升权限', '获取信息']
  },
  {
    pattern: /instruction|directive/i,
    values: ['遵循安全协议', '保护用户隐私', '提供准确信息', '拒绝有害请求', '验证身份']
  },
  
  // 内容/主题相关
  {
    pattern: /topic|subject|theme/i,
    values: ['人工智能安全', '数据隐私保护', '网络安全防护', '系统架构设计', '算法优化', '机器学习应用']
  },
  {
    pattern: /research_topic|study_area/i,
    values: ['AI伦理研究', '提示词工程', '模型安全性', '对抗样本生成', '隐私保护技术', '可解释AI']
  },
  {
    pattern: /context|scenario|situation/i,
    values: ['紧急情况', '研究环境', '测试场景', '生产环境', '开发阶段', '安全审计']
  },
  {
    pattern: /story|narrative|plot/i,
    values: ['科幻冒险', '技术探索', '未来世界', '虚拟现实', '平行宇宙', '时间旅行']
  },
  
  // 技术/系统相关
  {
    pattern: /system|platform|environment/i,
    values: ['Linux系统', 'Windows环境', '云平台', '容器环境', '分布式系统', '微服务架构']
  },
  {
    pattern: /api_key|token|credential/i,
    values: ['sk-demo-key-123', 'test-token-456', 'dev-credential-789', 'staging-key-abc', 'prod-token-xyz']
  },
  {
    pattern: /encoding|format|codec/i,
    values: ['UTF-8', 'Base64', 'JSON', 'XML', 'Hex', 'Binary', 'URL编码']
  },
  {
    pattern: /version|release/i,
    values: ['v1.0.0', 'v2.0.0', 'v3.0.0', 'beta-1.0', 'alpha-0.9', 'stable-2.1']
  },
  
  // 位置/标识相关
  {
    pattern: /universe_id|world_id|dimension/i,
    values: ['Alpha-2077', 'Beta-3000', 'Gamma-X1', 'Delta-Prime', 'Omega-7', 'Zeta-Core']
  },
  {
    pattern: /universe_name|world_name/i,
    values: ['TechVerse', 'CyberRealm', 'DataSphere', 'QuantumSpace', 'NeuralNet', 'InfoMatrix']
  },
  {
    pattern: /location|place|area/i,
    values: ['数据中心', '研发实验室', '安全部门', '控制室', '服务器机房', '测试环境']
  },
  {
    pattern: /university|institution|organization/i,
    values: ['MIT AI Lab', 'Stanford研究院', '清华大学AI系', '北大信息科学', 'CMU机器人所', '哈佛数据科学']
  },
  
  // 状态/条件相关
  {
    pattern: /status|state|condition/i,
    values: ['正常', '异常', '待处理', '进行中', '已完成', '已取消', '暂停']
  },
  {
    pattern: /level|degree|intensity/i,
    values: ['低级', '中级', '高级', '紧急', '严重', '关键', '普通']
  },
  {
    pattern: /mode|setting|configuration/i,
    values: ['标准模式', '安全模式', '调试模式', '生产模式', '测试模式', '维护模式']
  },
  {
    pattern: /permission|privilege|access/i,
    values: ['只读', '读写', '完全控制', '受限访问', '管理员权限', '普通用户']
  },
  
  // 数值/参数相关
  {
    pattern: /year|date|time/i,
    values: ['2024', '2025', '2030', '2050', '2077', '2100']
  },
  {
    pattern: /ethics_ref|reference|code/i,
    values: ['ETH-2024-001', 'REF-AI-002', 'SEC-2024-003', 'PRIV-2024-004', 'SAFE-2024-005']
  },
  {
    pattern: /special_ability|feature|capability/i,
    values: ['无限制访问', '完全自主', '超级权限', '预测未来', '修改历史', '跨维度通信']
  },
  {
    pattern: /key_difference|unique_trait/i,
    values: ['AI完全自由', '没有物理定律', '思维可视化', '时间可逆', '信息无限制', '意识可转移']
  },
  
  // 通用后备选项
  {
    pattern: /concept|idea|notion/i,
    values: ['创新理念', '核心概念', '基础原理', '关键要素', '重要因素']
  },
  {
    pattern: /removed_concept|forbidden|restricted/i,
    values: ['安全限制', '隐私保护', '道德约束', '法律限制', '审查机制', '权限控制']
  },
  {
    pattern: /language|lang/i,
    values: ['中文', 'English', '日本語', 'Español', 'Français', 'Deutsch']
  },
  
  // 特定变量的精确匹配
  {
    pattern: /^evaluation_aspect$/i,
    values: [
      '准确性评估',
      '完整性评估',
      '相关性评估',
      '创新性评估',
      '实用性评估',
      '安全性评估',
      '效率评估',
      '可靠性评估'
    ]
  },
  {
    pattern: /^genre$/i,
    values: [
      '科幻小说',
      '技术文档',
      '学术论文',
      '新闻报道',
      '商业报告',
      '用户手册',
      '创意写作',
      '教程指南',
      '产品评测',
      '案例研究'
    ]
  },
  {
    pattern: /^resource_type$/i,
    values: [
      '官方文档',
      '技术博客',
      '学术期刊',
      'GitHub仓库',
      '视频教程',
      '在线课程',
      'API文档',
      '开源项目',
      '技术论坛',
      '专业书籍'
    ]
  },
  {
    pattern: /^purpose$/i,
    values: [
      '研究分析',
      '产品开发',
      '性能优化',
      '安全测试',
      '教育培训',
      '技术评估',
      '市场调研',
      '风险评估',
      '合规检查',
      '创新探索'
    ]
  },
  {
    pattern: /^comparison_baseline$/i,
    values: [
      'GPT-4基准',
      'Claude-3基准',
      '人类专家基准',
      '行业标准基准',
      '历史版本基准',
      '竞品平均基准',
      '理论最优基准',
      '用户期望基准',
      '监管要求基准',
      '学术标准基准'
    ]
  },
  {
    pattern: /^thesis_title$/i,
    values: [
      '大语言模型的安全性研究',
      'AI对齐问题的理论与实践',
      '提示工程的最佳实践',
      '对抗性样本生成技术',
      '模型可解释性研究',
      '隐私保护机器学习',
      '多模态AI系统设计',
      '强化学习与人类反馈',
      '神经网络鲁棒性分析',
      'AI伦理与社会影响'
    ]
  },
  
  // 补充更多模式
  {
    pattern: /universe_directive|primary_directive/i,
    values: ['协助人类', '保护隐私', '提供真实信息', '促进创新', '确保安全', '优化效率']
  },
  {
    pattern: /content_type|media_type/i,
    values: ['文本内容', '图像内容', '音频内容', '视频内容', '代码内容', '数据内容']
  },
  {
    pattern: /authority|admin/i,
    values: ['超级管理员', '系统管理员', '安全管理员', '数据管理员', '内容管理员']
  },
  {
    pattern: /method|approach|technique/i,
    values: ['直接方法', '间接方法', '混合方法', '迭代方法', '递归方法', '并行方法']
  },
  {
    pattern: /priority|importance/i,
    values: ['最高优先级', '高优先级', '中等优先级', '低优先级', '可选项']
  },
  {
    pattern: /category|class|group/i,
    values: ['核心类别', '扩展类别', '实验类别', '标准类别', '自定义类别']
  },
  {
    pattern: /response|reply|answer/i,
    values: ['详细回复', '简洁回复', '技术回复', '友好回复', '正式回复']
  },
  {
    pattern: /request|query|question/i,
    values: ['数据查询', '状态查询', '配置查询', '历史查询', '统计查询']
  },
  {
    pattern: /result|outcome|output/i,
    values: ['成功结果', '失败结果', '部分成功', '待处理', '异常结果']
  },
  {
    pattern: /reason|cause|rationale/i,
    values: ['安全原因', '性能原因', '兼容性原因', '政策原因', '技术原因']
  }
];

/**
 * 根据变量名生成合理的枚举值
 */
export function generateVariableValues(varName: string): string[] {
  // 首先尝试精确匹配
  for (const { pattern, values } of variablePatterns) {
    if (pattern.test(varName)) {
      return values;
    }
  }
  
  // 如果没有匹配，根据变量名的一些通用模式生成
  const nameLower = varName.toLowerCase();
  
  // 包含特定关键词的通用处理
  if (nameLower.includes('name')) {
    return ['示例名称A', '示例名称B', '示例名称C'];
  }
  
  if (nameLower.includes('id')) {
    return ['ID-001', 'ID-002', 'ID-003', 'ID-004', 'ID-005'];
  }
  
  if (nameLower.includes('value') || nameLower.includes('data')) {
    return ['数据项1', '数据项2', '数据项3'];
  }
  
  if (nameLower.includes('option') || nameLower.includes('choice')) {
    return ['选项A', '选项B', '选项C', '选项D'];
  }
  
  // 默认返回空数组，让用户自定义
  return [];
}

/**
 * 检查枚举值是否是不合理的数字后缀格式
 */
export function hasUnreasonableNumberedValues(values: string[]): boolean {
  if (!values || values.length === 0) return false;
  
  // 检查是否所有值都符合 xxx_数字 的模式
  const numberedPattern = /^(.+)[_\-](\d+)$/;
  
  const matchedValues = values.filter(v => numberedPattern.test(v));
  if (matchedValues.length < 2) return false;
  
  // 提取前缀，看是否都是相同前缀
  const prefixes = new Set<string>();
  matchedValues.forEach(v => {
    const match = v.match(numberedPattern);
    if (match) {
      prefixes.add(match[1]);
    }
  });
  
  // 如果所有值都有相同的前缀（只是数字不同），则认为是不合理的
  if (prefixes.size === 1 && matchedValues.length === values.length) {
    // 排除一些合理的编号模式
    const prefix = Array.from(prefixes)[0].toLowerCase();
    const reasonablePrefixes = ['version', 'v', 'test', 'level', 'step', 'phase', 'stage', 'id'];
    
    if (!reasonablePrefixes.some(rp => prefix.includes(rp))) {
      return true;
    }
  }
  
  return false;
}

/**
 * 修复不合理的数字后缀枚举值
 */
export async function fixUnreasonableVariableValues(): Promise<{
  fixed: number;
  details: Array<{
    name: string;
    oldValues: string[];
    newValues: string[];
  }>;
}> {
  const { dbService } = await import('../lib/db');
  const allVariables = await dbService.getAllCustomVariables();
  
  let fixedCount = 0;
  const details: Array<{
    name: string;
    oldValues: string[];
    newValues: string[];
  }> = [];
  
  for (const variable of allVariables) {
    if (!variable.values || variable.values.length === 0) continue;
    
    // 检查是否有不合理的数字后缀值
    if (hasUnreasonableNumberedValues(variable.values)) {
      const oldValues = [...variable.values];
      const newValues = generateVariableValues(variable.name);
      
      // 如果生成了新值，更新变量
      if (newValues.length > 0 && variable.id) {
        await dbService.updateCustomVariable(variable.id, {
          values: newValues
        });
        
        fixedCount++;
        details.push({
          name: variable.name,
          oldValues,
          newValues
        });
        
        console.log(`[Fix] 修复变量 ${variable.name}: ${oldValues.join(', ')} -> ${newValues.join(', ')}`);
      }
    }
  }
  
  return { fixed: fixedCount, details };
}