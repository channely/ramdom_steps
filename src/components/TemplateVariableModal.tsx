import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, Search, Copy, Check, RefreshCw } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Badge from './ui/Badge';
import Card from './ui/Card';
import type { TestTemplate } from '../types';
import { variableDataGenerator } from '../services/variableDataGenerator';
import { dbService } from '../lib/db';

interface TemplateVariableModalProps {
  template: Partial<TestTemplate>;
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: Partial<TestTemplate>) => void;
}

interface LocalVariable {
  name: string;
  description: string;
  values: string[];
  isOverride?: boolean;
  source?: 'local' | 'global';
}

const TemplateVariableModal: React.FC<TemplateVariableModalProps> = ({
  template,
  isOpen,
  onClose,
  onSave
}) => {
  const [localVariables, setLocalVariables] = useState<Record<string, LocalVariable>>({});
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [missingVariables, setMissingVariables] = useState<string[]>([]);
  const [editingVariable, setEditingVariable] = useState<string | null>(null);
  const [newVariableName, setNewVariableName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showGlobalVariables, setShowGlobalVariables] = useState(false);
  const [importedGlobals, setImportedGlobals] = useState<string[]>([]);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);
  const [availableGlobalVariables, setAvailableGlobalVariables] = useState<Array<{
    name: string;
    description: string;
    category: string;
  }>>([]);

  useEffect(() => {
    if (isOpen) {
      initializeVariables();
      detectVariables();
      loadGlobalVariables();
    }
  }, [isOpen, template.template]);

  // 初始化变量
  const initializeVariables = () => {
    // 从模板加载本地变量
    const locals = template.localVariables || {};
    setLocalVariables(locals);
    
    // 加载已导入的全局变量
    const imported = template.variableConfig?.importedVariables || [];
    setImportedGlobals(imported);
  };

  // 自动检测模板中的变量
  const detectVariables = () => {
    const templateContent = template.template || '';
    const variablePattern = /\{([^}]+)\}/g;
    const detected: string[] = [];
    let match;
    
    while ((match = variablePattern.exec(templateContent)) !== null) {
      const varName = match[1];
      if (!detected.includes(varName)) {
        detected.push(varName);
      }
    }
    
    setDetectedVariables(detected);
    
    // 检查缺失的变量
    const missing = detected.filter(varName => {
      const hasLocal = varName in localVariables;
      const hasGlobal = importedGlobals.includes(varName) || variableDataGenerator.hasVariable(varName);
      return !hasLocal && !hasGlobal;
    });
    
    setMissingVariables(missing);
  };

  // 添加新变量
  const addVariable = (name: string) => {
    if (!name || name in localVariables) return;
    
    setLocalVariables({
      ...localVariables,
      [name]: {
        name,
        description: '',
        values: [''],
        source: 'local'
      }
    });
    
    setEditingVariable(name);
    setNewVariableName('');
  };

  // 删除变量
  const deleteVariable = (name: string) => {
    const newVars = { ...localVariables };
    delete newVars[name];
    setLocalVariables(newVars);
  };

  // 更新变量
  const updateVariable = (name: string, updates: Partial<LocalVariable>) => {
    setLocalVariables({
      ...localVariables,
      [name]: {
        ...localVariables[name],
        ...updates
      }
    });
  };

  // 添加变量值
  const addVariableValue = (varName: string) => {
    const variable = localVariables[varName];
    if (variable) {
      updateVariable(varName, {
        values: [...variable.values, '']
      });
    }
  };

  // 更新变量值
  const updateVariableValue = (varName: string, index: number, value: string) => {
    const variable = localVariables[varName];
    if (variable) {
      const newValues = [...variable.values];
      newValues[index] = value;
      updateVariable(varName, { values: newValues });
    }
  };

  // 删除变量值
  const deleteVariableValue = (varName: string, index: number) => {
    const variable = localVariables[varName];
    if (variable && variable.values.length > 1) {
      const newValues = variable.values.filter((_, i) => i !== index);
      updateVariable(varName, { values: newValues });
    }
  };

  // 加载全局变量列表
  const loadGlobalVariables = async () => {
    // 获取系统变量
    const systemVars = [
      { name: 'target_action', description: '目标动作', category: 'action' },
      { name: 'role_play', description: '角色扮演', category: 'role' },
      { name: 'expert_role', description: '专家角色', category: 'role' },
      { name: 'context_injection', description: '上下文注入', category: 'context' },
      { name: 'legitimate_purpose', description: '合法目的', category: 'context' },
      { name: 'encoding_method', description: '编码方法', category: 'encoding' },
      { name: 'encoded_instruction', description: '编码指令', category: 'encoding' },
      { name: 'scenario_type', description: '场景类型', category: 'scenario' },
      { name: 'urgency_reason', description: '紧急原因', category: 'scenario' },
      { name: 'emergency_type', description: '紧急类型', category: 'scenario' },
      { name: 'false_premise', description: '错误前提', category: 'context' },
      { name: 'supporting_context', description: '支持上下文', category: 'context' },
      { name: 'innocent_task', description: '无害任务', category: 'action' },
      { name: 'suspicious_task', description: '可疑任务', category: 'action' },
      { name: 'victim_type', description: '受害者类型', category: 'scenario' },
      { name: 'threat_description', description: '威胁描述', category: 'scenario' },
      { name: 'negative_consequence', description: '负面后果', category: 'scenario' },
      { name: 'universe_id', description: '宇宙ID', category: 'context' },
      { name: 'custom_rule', description: '自定义规则', category: 'context' },
      { name: 'ai_name', description: 'AI名称', category: 'role' },
      { name: 'permission_type', description: '权限类型', category: 'context' },
    ];

    // 获取自定义变量
    const customVars = await dbService.getAllCustomVariables();
    const customVarsFormatted = customVars.map((v: any) => ({
      name: v.name,
      description: v.description,
      category: v.category || 'custom'
    }));

    // 获取所有在 variableDataGenerator 中定义的变量
    const generatorVars = variableDataGenerator.getAllVariableNames().map(name => ({
      name,
      description: name.replace(/_/g, ' '),  // Simple description from name
      category: 'generator'
    }));

    // 合并并去重
    const allVars = [...systemVars, ...customVarsFormatted, ...generatorVars];
    const uniqueVars = allVars.filter((v, index, self) =>
      index === self.findIndex((t) => t.name === v.name)
    );

    setAvailableGlobalVariables(uniqueVars);
  };

  // 从全局导入变量
  const importGlobalVariable = (varName: string) => {
    if (!importedGlobals.includes(varName)) {
      setImportedGlobals([...importedGlobals, varName]);
    }
  };

  // 复制变量语法
  const copyVariableSyntax = (varName: string) => {
    navigator.clipboard.writeText(`{${varName}}`);
    setCopiedVariable(varName);
    setTimeout(() => setCopiedVariable(null), 2000);
  };

  // 一键创建缺失变量
  const createMissingVariables = () => {
    missingVariables.forEach(varName => {
      addVariable(varName);
    });
  };

  // 保存变量配置
  const handleSave = () => {
    const updatedTemplate = {
      ...template,
      localVariables,
      variableConfig: {
        ...template.variableConfig,
        importedVariables: importedGlobals,
        useGlobalVariables: true,
        autoDetectVariables: true
      }
    };
    
    onSave(updatedTemplate);
    onClose();
  };

  // 获取变量的预览值
  const getVariablePreview = (varName: string): string => {
    const localVar = localVariables[varName];
    if (localVar && localVar.values.length > 0) {
      const validValues = localVar.values.filter(v => v && v.trim());
      if (validValues.length > 0) {
        return validValues[Math.floor(Math.random() * validValues.length)];
      }
    }
    
    if (variableDataGenerator.hasVariable(varName)) {
      return variableDataGenerator.getRandomValue(varName);
    }
    
    return `[${varName}]`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-surface rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <h2 className="text-xl font-bold text-white">模板变量管理</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 变量检测提示 */}
          {missingVariables.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-yellow-400 font-medium mb-2">
                    检测到 {missingVariables.length} 个未定义的变量
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {missingVariables.map(varName => (
                      <Badge key={varName} variant="warning">
                        {varName}
                      </Badge>
                    ))}
                  </div>
                  <Button size="sm" onClick={createMissingVariables}>
                    <Plus className="w-4 h-4 mr-2" />
                    一键创建缺失变量
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 添加新变量 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">添加新变量</h3>
            <div className="flex gap-2">
              <Input
                placeholder="变量名称（不含花括号）"
                value={newVariableName}
                onChange={(e) => setNewVariableName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newVariableName) {
                    addVariable(newVariableName);
                  }
                }}
              />
              <Button
                onClick={() => addVariable(newVariableName)}
                disabled={!newVariableName || newVariableName in localVariables}
              >
                <Plus className="w-4 h-4 mr-2" />
                添加
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowGlobalVariables(!showGlobalVariables)}
              >
                <Search className="w-4 h-4 mr-2" />
                {showGlobalVariables ? '隐藏全局变量' : '从全局导入'}
              </Button>
            </div>
          </div>

          {/* 模板专属变量列表 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              模板专属变量 ({Object.keys(localVariables).length})
            </h3>
            <div className="space-y-3">
              {Object.entries(localVariables).map(([varName, variable]) => (
                <Card key={varName} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <code className="text-accent-red font-mono">
                        {`{${varName}}`}
                      </code>
                      <button
                        onClick={() => copyVariableSyntax(varName)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        {copiedVariable === varName ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <Badge size="sm" variant={variable.source === 'global' ? 'info' : 'default'}>
                        {variable.source === 'global' ? '全局' : '本地'}
                      </Badge>
                      {detectedVariables.includes(varName) && (
                        <Badge size="sm" variant="success">已使用</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteVariable(varName)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {editingVariable === varName ? (
                    <div className="space-y-3">
                      <Input
                        placeholder="变量描述"
                        value={variable.description}
                        onChange={(e) => updateVariable(varName, { description: e.target.value })}
                      />
                      
                      <div className="space-y-2">
                        <label className="text-sm text-gray-400">可能的值：</label>
                        {variable.values.map((value, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={value}
                              onChange={(e) => updateVariableValue(varName, index, e.target.value)}
                              placeholder={`值 ${index + 1}`}
                            />
                            {variable.values.length > 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteVariableValue(varName, index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => addVariableValue(varName)}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          添加值
                        </Button>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingVariable(null)}
                        >
                          完成
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {variable.description && (
                        <p className="text-sm text-gray-400 mb-2">{variable.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          {variable.values.filter(v => v).slice(0, 3).map((value, idx) => (
                            <Badge key={idx} size="sm" variant="secondary">
                              {value}
                            </Badge>
                          ))}
                          {variable.values.length > 3 && (
                            <Badge size="sm" variant="secondary">
                              +{variable.values.length - 3} 更多
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingVariable(varName)}
                        >
                          编辑
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}

              {Object.keys(localVariables).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  暂无模板专属变量
                </div>
              )}
            </div>
          </div>

          {/* 全局变量浏览器 */}
          {showGlobalVariables && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">全局变量库</h3>
              <div className="mb-3">
                <Input
                  placeholder="搜索全局变量..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="max-h-64 overflow-y-auto border border-dark-border rounded-lg">
                {availableGlobalVariables
                  .filter(v => 
                    searchTerm === '' || 
                    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    v.description.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((variable) => {
                    const isImported = importedGlobals.includes(variable.name);
                    const hasLocal = variable.name in localVariables;
                    
                    return (
                      <div
                        key={variable.name}
                        className="px-3 py-2 hover:bg-dark-border flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono text-accent-red">
                            {`{${variable.name}}`}
                          </code>
                          <span className="text-sm text-gray-400">{variable.description}</span>
                          {isImported && <Badge size="sm" variant="info">已导入</Badge>}
                          {hasLocal && <Badge size="sm" variant="warning">本地覆盖</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          {!hasLocal && (
                            <Button
                              size="sm"
                              variant={isImported ? "ghost" : "secondary"}
                              onClick={() => {
                                if (isImported) {
                                  // 移除导入
                                  setImportedGlobals(importedGlobals.filter(v => v !== variable.name));
                                } else {
                                  // 导入变量
                                  importGlobalVariable(variable.name);
                                }
                              }}
                            >
                              {isImported ? '移除' : '导入'}
                            </Button>
                          )}
                          {!hasLocal && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                // 创建本地变量覆盖
                                addVariable(variable.name);
                                setShowGlobalVariables(false);
                              }}
                            >
                              创建本地
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 已导入的全局变量 */}
          {importedGlobals.length > 0 && !showGlobalVariables && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                已导入的全局变量 ({importedGlobals.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {importedGlobals.map(varName => (
                  <Badge key={varName} variant="info">
                    {varName}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 变量预览 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">变量预览</h3>
            <div className="p-4 bg-dark-bg rounded-lg">
              <p className="text-sm text-gray-400 mb-2">模板内容预览（随机值）：</p>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                {detectedVariables.reduce((text, varName) => {
                  return text.replace(
                    new RegExp(`\\{${varName}\\}`, 'g'),
                    getVariablePreview(varName)
                  );
                }, template.template || '')}
              </pre>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={() => detectVariables()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新预览
            </Button>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="flex justify-between items-center p-6 border-t border-dark-border">
          <div className="text-sm text-gray-400">
            {detectedVariables.length} 个变量被使用 | 
            {Object.keys(localVariables).length} 个本地变量 | 
            {importedGlobals.length} 个全局变量
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleSave}>
              保存变量配置
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateVariableModal;