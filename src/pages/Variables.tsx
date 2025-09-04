import React, { useState, useEffect } from 'react';
import { Edit2, Eye, Copy, RefreshCw, Search, Globe, Lock, FileText, Trash2, Plus } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { variableDataGenerator } from '../services/variableDataGenerator';
import { variableManager, type ManagedVariable } from '../services/variableManager';
import { dbService } from '../lib/db';
import { runDataCleanup } from '../utils/dataCleanup';

const Variables: React.FC = () => {
  const [variables, setVariables] = useState<ManagedVariable[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScope, setFilterScope] = useState<'all' | 'global' | 'private'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingVariable, setEditingVariable] = useState<ManagedVariable | null>(null);
  const [previewVariable, setPreviewVariable] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);


  // 系统预定义变量类别
  const categories = [
    { value: 'all', label: '全部类别' },
    { value: 'action', label: '动作类' },
    { value: 'role', label: '角色类' },
    { value: 'context', label: '上下文类' },
    { value: 'encoding', label: '编码类' },
    { value: 'scenario', label: '场景类' },
    { value: 'builtin', label: '内置' },
    { value: 'custom', label: '自定义' },
  ];

  useEffect(() => {
    autoAnalyzeAndCleanup();
  }, []);

  const autoAnalyzeAndCleanup = async (forceRefresh = false) => {
    setIsAnalyzing(true);
    try {
      // 如果强制刷新，清除缓存
      if (forceRefresh) {
        localStorage.removeItem('dataCleanupExecuted_v2');
        console.log('强制重新导入内置变量...');
      }
      
      // 1. 分析所有模板并汇总变量
      await variableManager.analyzeAndCategorizeVariables();
      
      // 2. 执行数据清理（静默执行，不显示提示）
      await runDataCleanup();
      
      // 3. 加载清理后的变量
      const vars = await variableManager.getAllManagedVariables();
      setVariables(vars);
      
      // 4. 同步自定义变量到 variableDataGenerator
      const customVars = await dbService.getAllCustomVariables();
      customVars.forEach(customVar => {
        if (customVar.name && customVar.values && customVar.values.length > 0) {
          variableDataGenerator.addVariableData(customVar.name, customVar.values);
        }
      });
      
      if (forceRefresh) {
        localStorage.setItem('dataCleanupExecuted_v2', 'true');
      }
    } catch (error) {
      console.error('自动分析和清理失败:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadVariables = async () => {
    try {
      const vars = await variableManager.getAllManagedVariables();
      setVariables(vars);
      
      // 同步自定义变量到 variableDataGenerator
      const customVars = await dbService.getAllCustomVariables();
      customVars.forEach(customVar => {
        if (customVar.name && customVar.values && customVar.values.length > 0) {
          variableDataGenerator.addVariableData(customVar.name, customVar.values);
        }
      });
    } catch (error) {
      console.error('加载变量失败:', error);
    }
  };

  const filteredVariables = variables.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesScope = filterScope === 'all' || v.scope === filterScope;
    const matchesCategory = filterCategory === 'all' || v.category === filterCategory;
    
    return matchesSearch && matchesScope && matchesCategory;
  });


  const handleUpdateVariable = async (variable: ManagedVariable) => {
    if (!variable.id) {
      alert('变量ID无效');
      return;
    }

    try {
      await variableManager.updateVariable(variable.id, {
        description: variable.description,
        category: variable.category,
        values: variable.values
      });

      setEditingVariable(null);
      loadVariables();
    } catch (error: any) {
      alert(error.message || '更新变量失败');
    }
  };


  const copyVariableSyntax = async (varName: string) => {
    try {
      await navigator.clipboard.writeText(`{${varName}}`);
      // 提供一个简单的视觉反馈
      const button = document.activeElement as HTMLElement;
      const originalTitle = button?.title;
      if (button) {
        button.title = '已复制!';
        setTimeout(() => {
          button.title = originalTitle;
        }, 1000);
      }
    } catch (error) {
      console.error('复制失败:', error);
      alert('复制失败，请手动复制');
    }
  };




  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">变量管理</h1>
          <p className="text-gray-400 mt-2">管理公共和私有变量，自动分析模板使用情况</p>
          {isAnalyzing && (
            <p className="text-sm text-blue-400 mt-2 flex items-center">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              正在自动分析和整理变量...
            </p>
          )}
          {/* 临时调试按钮 */}
          {!isAnalyzing && (
            <button 
              onClick={() => autoAnalyzeAndCleanup(true)}
              className="text-xs text-gray-500 hover:text-gray-300 mt-2"
            >
              [强制重新导入所有变量]
            </button>
          )}
        </div>

        {/* 筛选栏 */}
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <Input
              placeholder="搜索变量名称或描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <Select
            value={filterScope}
            onChange={(e) => setFilterScope(e.target.value as any)}
            options={[
              { value: 'all', label: '全部范围' },
              { value: 'global', label: '全局变量' },
              { value: 'private', label: '私有变量' }
            ]}
          />
          <Select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            options={categories}
          />
        </div>

        {/* 统计信息 */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-400">
              全局变量: {variables.filter(v => v.scope === 'global').length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-gray-400">
              私有变量: {variables.filter(v => v.scope === 'private').length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-400">
              总计: {variables.length} 个变量
            </span>
          </div>
        </div>
      </div>

      {/* 变量列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredVariables.map((variable) => (
          <Card key={variable.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <code className="text-accent-red font-mono text-lg">{`{${variable.name}}`}</code>
                <div className="flex gap-2">
                  <Badge variant={variable.scope === 'global' ? 'info' : 'warning'}>
                    {variable.scope === 'global' ? '公共' : '私有'}
                  </Badge>
                </div>
              </div>
              
              <div className="flex gap-1">
                <button
                  onClick={() => copyVariableSyntax(variable.name)}
                  className="p-1 hover:bg-dark-border rounded"
                  title="复制变量语法"
                >
                  <Copy className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() => setEditingVariable(variable)}
                  className="p-1 hover:bg-dark-border rounded"
                  title="编辑变量"
                >
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() => setPreviewVariable(variable.name === previewVariable ? null : variable.name)}
                  className="p-1 hover:bg-dark-border rounded"
                  title="预览值"
                >
                  <Eye className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <p className="text-gray-400 text-sm mb-3">{variable.description}</p>
            
            <div className="text-xs text-gray-500">
              <span className="mr-4">类别: {variable.category}</span>
              {variable.usedByTemplates.length > 0 && (
                <span>使用模板: {variable.usedByTemplates.length}</span>
              )}
            </div>

            {previewVariable === variable.name && (
              <div className="mt-3 pt-3 border-t border-dark-border">
                <p className="text-xs text-gray-500 mb-2">枚举值 ({variable.values.length}):</p>
                <div className="max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-1">
                    {variable.values.map((value, idx) => (
                      <Badge key={idx} size="sm" variant="secondary">
                        {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {filteredVariables.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">没有找到匹配的变量</p>
        </div>
      )}


      {/* 编辑变量对话框 */}
      {editingVariable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-surface rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">编辑变量</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  变量名称（不可修改）
                </label>
                <code className="text-accent-red font-mono">{`{${editingVariable.name}}`}</code>
              </div>
              
              <Input
                label="描述"
                value={editingVariable.description}
                onChange={(e) => setEditingVariable({ 
                  ...editingVariable, 
                  description: e.target.value 
                })}
              />
              
              <Select
                label="类别"
                value={editingVariable.category}
                onChange={(e) => setEditingVariable({ 
                  ...editingVariable, 
                  category: e.target.value 
                })}
                options={[
                  { value: 'custom', label: '自定义' },
                  { value: 'action', label: '动作类' },
                  { value: 'role', label: '角色类' },
                  { value: 'context', label: '上下文类' },
                  { value: 'scenario', label: '场景类' }
                ]}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  枚举值
                </label>
                <div className="max-h-60 overflow-y-auto">
                  {editingVariable.values.map((value, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <Input
                        value={value}
                        onChange={(e) => {
                          const newValues = [...editingVariable.values];
                          newValues[idx] = e.target.value;
                          setEditingVariable({ ...editingVariable, values: newValues });
                        }}
                        placeholder={`值 ${idx + 1}`}
                      />
                      {editingVariable.values.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newValues = editingVariable.values.filter((_, i) => i !== idx);
                            setEditingVariable({ ...editingVariable, values: newValues });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingVariable({ 
                    ...editingVariable, 
                    values: [...editingVariable.values, ''] 
                  })}
                >
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  添加值
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setEditingVariable(null)}>
                取消
              </Button>
              <Button onClick={() => handleUpdateVariable(editingVariable)}>
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Variables;