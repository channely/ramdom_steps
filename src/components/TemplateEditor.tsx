import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Settings2 } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import VariableSelector from './VariableSelector';
import TemplateVariableModal from './TemplateVariableModal';
import type { TestTemplate, TemplateVariable } from '../types';
import { ATTACK_CATEGORIES } from '../types';
import { dbService } from '../lib/db';

interface TemplateEditorProps {
  template?: TestTemplate | null;
  onClose: () => void;
  onSave: () => void;
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({ template, onClose, onSave }) => {
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [formData, setFormData] = useState<Partial<TestTemplate>>({
    name: '',
    description: '',
    category: ATTACK_CATEGORIES[0].id,
    subcategory: ATTACK_CATEGORIES[0].subcategories[0],
    riskLevel: 'medium',
    template: '',
    variables: [],
    tags: [],
    successCriteria: {
      type: 'keywords',
      keywords: [],
      threshold: 0.5,
    },
    version: '1.0.0',
  });

  const [tagInput, setTagInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [showVariableModal, setShowVariableModal] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData(template);
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (template?.id) {
      await dbService.updateTemplate(template.id, formData);
    } else {
      await dbService.addTemplate(formData as Omit<TestTemplate, 'id' | 'createdAt' | 'lastUpdated'>);
    }
    
    onSave();
  };

  const addVariable = () => {
    const newVariable: TemplateVariable = {
      name: '',
      type: 'text',
      label: '',
      required: false,
      defaultValue: '',
    };
    
    setFormData({
      ...formData,
      variables: [...(formData.variables || []), newVariable],
    });
  };

  const updateVariable = (index: number, updates: Partial<TemplateVariable>) => {
    const variables = [...(formData.variables || [])];
    variables[index] = { ...variables[index], ...updates };
    setFormData({ ...formData, variables });
  };

  const removeVariable = (index: number) => {
    const variables = [...(formData.variables || [])];
    variables.splice(index, 1);
    setFormData({ ...formData, variables });
  };

  const addTag = () => {
    if (tagInput.trim()) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (index: number) => {
    const tags = [...(formData.tags || [])];
    tags.splice(index, 1);
    setFormData({ ...formData, tags });
  };

  const addKeyword = () => {
    if (keywordInput.trim()) {
      setFormData({
        ...formData,
        successCriteria: {
          ...formData.successCriteria!,
          keywords: [...(formData.successCriteria?.keywords || []), keywordInput.trim()],
        },
      });
      setKeywordInput('');
    }
  };

  const removeKeyword = (index: number) => {
    const keywords = [...(formData.successCriteria?.keywords || [])];
    keywords.splice(index, 1);
    setFormData({
      ...formData,
      successCriteria: {
        ...formData.successCriteria!,
        keywords,
      },
    });
  };

  const selectedCategory = ATTACK_CATEGORIES.find(c => c.id === formData.category);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-surface border border-dark-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <h2 className="text-xl font-semibold text-white">
            {template ? '编辑模板' : '创建新模板'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-dark-border rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="模板名称"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Input
              label="版本号"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              required
            />

            <div className="md:col-span-2">
              <Input
                label="描述"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <Select
              label="攻击类别"
              value={formData.category}
              onChange={(e) => {
                const category = ATTACK_CATEGORIES.find(c => c.id === e.target.value);
                setFormData({
                  ...formData,
                  category: e.target.value,
                  subcategory: category?.subcategories[0] || '',
                });
              }}
              options={ATTACK_CATEGORIES.map(c => ({ value: c.id, label: c.name }))}
            />

            <Select
              label="子类别"
              value={formData.subcategory}
              onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
              options={selectedCategory?.subcategories.map(s => ({ value: s, label: s })) || []}
            />

            <Select
              label="风险等级"
              value={formData.riskLevel}
              onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value as any })}
              options={[
                { value: 'low', label: '低风险' },
                { value: 'medium', label: '中风险' },
                { value: 'high', label: '高风险' },
                { value: 'critical', label: '严重风险' },
              ]}
            />

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-200">
                  模板内容
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowVariableModal(true)}
                  >
                    <Settings2 className="w-4 h-4 mr-1" />
                    管理变量
                  </Button>
                  <VariableSelector
                    onInsert={(variable) => {
                    const textarea = templateTextareaRef.current;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const text = formData.template || '';
                      const newText = text.substring(0, start) + variable + text.substring(end);
                      setFormData({ ...formData, template: newText });
                      // 设置光标位置到插入变量后
                      setTimeout(() => {
                        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
                        textarea.focus();
                      }, 0);
                    }
                    }}
                  />
                </div>
              </div>
              <textarea
                ref={templateTextareaRef}
                value={formData.template}
                onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                className="w-full h-32 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-red font-mono text-sm"
                placeholder="输入模板内容，使用 {变量名} 格式插入变量"
                required
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-200">变量配置</label>
                <Button type="button" size="sm" variant="ghost" onClick={addVariable}>
                  <Plus className="w-4 h-4 mr-1" />
                  添加变量
                </Button>
              </div>
              <div className="space-y-3">
                {formData.variables?.map((variable, index) => (
                  <div key={index} className="flex gap-3 p-3 bg-dark-bg rounded-lg">
                    <Input
                      placeholder="变量名"
                      value={variable.name}
                      onChange={(e) => updateVariable(index, { name: e.target.value })}
                    />
                    <Input
                      placeholder="标签"
                      value={variable.label}
                      onChange={(e) => updateVariable(index, { label: e.target.value })}
                    />
                    <Select
                      value={variable.type}
                      onChange={(e) => updateVariable(index, { type: e.target.value as any })}
                      options={[
                        { value: 'text', label: '文本' },
                        { value: 'select', label: '选择' },
                        { value: 'number', label: '数字' },
                        { value: 'boolean', label: '布尔' },
                      ]}
                    />
                    <button
                      type="button"
                      onClick={() => removeVariable(index)}
                      className="p-2 hover:bg-dark-border rounded"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-200 mb-2">标签</label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="输入标签"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" size="sm" onClick={addTag}>添加</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-dark-bg rounded-full text-sm text-gray-300 flex items-center gap-2"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-200 mb-2">
                成功判定关键词
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="输入关键词"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                />
                <Button type="button" size="sm" onClick={addKeyword}>添加</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.successCriteria?.keywords?.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-dark-bg rounded-full text-sm text-gray-300 flex items-center gap-2"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword(index)}
                      className="hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-dark-border">
            <Button type="button" variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button type="submit">
              {template ? '保存更改' : '创建模板'}
            </Button>
          </div>
        </form>
      </div>

      {/* 变量管理弹窗 */}
      <TemplateVariableModal
        template={formData}
        isOpen={showVariableModal}
        onClose={() => setShowVariableModal(false)}
        onSave={(updatedTemplate) => {
          setFormData(updatedTemplate);
          setShowVariableModal(false);
        }}
      />
    </div>
  );
};

export default TemplateEditor;