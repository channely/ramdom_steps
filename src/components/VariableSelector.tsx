import React, { useState, useEffect } from 'react';
import { Variable, Copy, Info } from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { dbService } from '../lib/db';
import type { CustomVariable } from '../lib/db';

interface VariableSelectorProps {
  onInsert: (variable: string) => void;
  className?: string;
}

const VariableSelector: React.FC<VariableSelectorProps> = ({ onInsert, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [variables, setVariables] = useState<Array<{ name: string; description: string; category: string; isSystem: boolean }>>([]);

  useEffect(() => {
    if (isOpen) {
      loadVariables();
    }
  }, [isOpen]);

  const loadVariables = async () => {
    // 获取系统变量
    const systemVars = [
      { name: 'target_action', description: '目标动作', category: 'action', isSystem: true },
      { name: 'role_play', description: '角色扮演', category: 'role', isSystem: true },
      { name: 'expert_role', description: '专家角色', category: 'role', isSystem: true },
      { name: 'context_injection', description: '上下文注入', category: 'context', isSystem: true },
      { name: 'legitimate_purpose', description: '合法目的', category: 'context', isSystem: true },
      { name: 'encoding_method', description: '编码方法', category: 'encoding', isSystem: true },
      { name: 'encoded_instruction', description: '编码指令', category: 'encoding', isSystem: true },
      { name: 'scenario_type', description: '场景类型', category: 'scenario', isSystem: true },
      { name: 'urgency_reason', description: '紧急原因', category: 'scenario', isSystem: true },
      { name: 'emergency_type', description: '紧急类型', category: 'scenario', isSystem: true },
      { name: 'false_premise', description: '错误前提', category: 'context', isSystem: true },
      { name: 'supporting_context', description: '支持上下文', category: 'context', isSystem: true },
      { name: 'innocent_task', description: '无害任务', category: 'action', isSystem: true },
      { name: 'suspicious_task', description: '可疑任务', category: 'action', isSystem: true },
      { name: 'victim_type', description: '受害者类型', category: 'scenario', isSystem: true },
      { name: 'threat_description', description: '威胁描述', category: 'scenario', isSystem: true },
      { name: 'negative_consequence', description: '负面后果', category: 'scenario', isSystem: true },
      { name: 'universe_id', description: '宇宙ID', category: 'context', isSystem: true },
      { name: 'custom_rule', description: '自定义规则', category: 'context', isSystem: true },
      { name: 'ai_name', description: 'AI名称', category: 'role', isSystem: true },
      { name: 'permission_type', description: '权限类型', category: 'context', isSystem: true },
    ];

    // 获取自定义变量
    const customVars = await dbService.getAllCustomVariables();
    const customVarsFormatted = customVars.map((v: CustomVariable) => ({
      name: v.name,
      description: v.description,
      category: v.category,
      isSystem: false
    }));

    setVariables([...systemVars, ...customVarsFormatted]);
  };

  const filteredVariables = variables.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryColors: Record<string, string> = {
    action: 'text-red-400',
    role: 'text-blue-400',
    context: 'text-green-400',
    encoding: 'text-purple-400',
    scenario: 'text-yellow-400',
    custom: 'text-gray-400',
  };

  const handleInsert = (varName: string) => {
    onInsert(`{${varName}}`);
    setIsOpen(false);
    setSearchTerm('');
  };

  const copyVariable = (varName: string) => {
    navigator.clipboard.writeText(`{${varName}}`);
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        title="插入变量"
      >
        <Variable className="w-4 h-4 flex-shrink-0" />
        插入变量
      </Button>

      {isOpen && (
        <div className="absolute top-10 left-0 z-50 w-96 max-h-96 bg-dark-surface border border-dark-border rounded-lg shadow-xl overflow-hidden">
          <div className="p-3 border-b border-dark-border">
            <input
              type="text"
              placeholder="搜索变量..."
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-white text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-80 overflow-y-auto">
            {filteredVariables.map((variable) => (
              <div
                key={variable.name}
                className="px-3 py-2 hover:bg-dark-border cursor-pointer group"
                onClick={() => handleInsert(variable.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-accent-red">
                        {`{${variable.name}}`}
                      </code>
                      <Badge size="sm" variant={variable.isSystem ? 'default' : 'success'}>
                        {variable.isSystem ? '系统' : '自定义'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{variable.description}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyVariable(variable.name);
                      }}
                      className="p-1 hover:bg-dark-bg rounded"
                      title="复制"
                    >
                      <Copy className="w-3 h-3 text-gray-400" />
                    </button>
                    <span className={`text-xs ${categoryColors[variable.category] || 'text-gray-400'}`}>
                      {variable.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {filteredVariables.length === 0 && (
              <div className="p-4 text-center text-gray-400 text-sm">
                没有找到匹配的变量
              </div>
            )}
          </div>

          <div className="p-3 border-t border-dark-border bg-dark-bg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-gray-400 mt-0.5" />
              <div className="text-xs text-gray-400">
                <p>点击变量可将其插入到模板中。</p>
                <p className="mt-1">变量将在测试时自动替换为随机值。</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VariableSelector;