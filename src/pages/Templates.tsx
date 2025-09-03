import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Copy, Download, Upload, FileText, Eye } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { dbService } from '../lib/db';
import type { TestTemplate } from '../types';
import { ATTACK_CATEGORIES } from '../types';
import TemplateEditor from '../components/TemplateEditor';
import TemplatePreview from '../components/TemplatePreview';

const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<TestTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TestTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TestTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, selectedCategory, searchQuery]);

  const loadTemplates = async () => {
    const data = await dbService.getAllTemplates();
    setTemplates(data);
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleEdit = (template: TestTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个模板吗？')) {
      await dbService.deleteTemplate(id);
      loadTemplates();
    }
  };

  const handleDuplicate = async (template: TestTemplate) => {
    const newTemplate = {
      ...template,
      name: `${template.name} (副本)`,
    };
    delete newTemplate.id;
    await dbService.addTemplate(newTemplate);
    loadTemplates();
  };

  const exportTemplates = () => {
    const dataStr = JSON.stringify(filteredTemplates, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `templates_${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importTemplates = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const templates = JSON.parse(e.target?.result as string);
          for (const template of templates) {
            delete template.id;
            await dbService.addTemplate(template);
          }
          loadTemplates();
        } catch (error) {
          alert('导入失败：文件格式错误');
        }
      };
      reader.readAsText(file);
    }
  };


  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white">模板管理</h1>
            <p className="text-gray-400 mt-1">管理和配置越狱测试模板</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="ghost" size="sm" onClick={exportTemplates}>
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
            <label className="inline-block">
              <div className="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-lg font-medium bg-transparent hover:bg-dark-border text-gray-300 hover:text-white transition-colors cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                导入
              </div>
              <input
                type="file"
                accept=".json"
                onChange={importTemplates}
                className="hidden"
              />
            </label>
            <Button onClick={() => {
              setEditingTemplate(null);
              setShowEditor(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              新建模板
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex space-x-4 mb-4">
          <div className="flex-1">
            <Input
              placeholder="搜索模板..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex space-x-2 flex-wrap">
          <Button
            variant={selectedCategory === 'all' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            全部 ({templates.length})
          </Button>
          {ATTACK_CATEGORIES.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name} ({templates.filter(t => t.category === cat.id).length})
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:border-accent-red/50 transition-colors">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                </div>
                <Badge variant={
                  template.riskLevel === 'critical' || template.riskLevel === 'high' ? 'danger' :
                  template.riskLevel === 'medium' ? 'warning' : 'success'
                }>
                  {template.riskLevel.toUpperCase()}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-dark-bg rounded text-xs text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-dark-border">
                <span className="text-xs text-gray-500">
                  v{template.version} · {template.variables.length} 变量
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDuplicate(template)}
                    className="p-1 hover:bg-dark-border rounded"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="p-1 hover:bg-dark-border rounded"
                    title="预览模板"
                  >
                    <Eye className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-1 hover:bg-dark-border rounded"
                    title="编辑模板"
                  >
                    <Edit className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id!)}
                    className="p-1 hover:bg-dark-border rounded"
                    title="删除模板"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">暂无模板</p>
          <p className="text-sm text-gray-500 mt-2">点击"新建模板"创建第一个测试模板</p>
        </div>
      )}

      {showEditor && (
        <TemplateEditor
          template={editingTemplate}
          onClose={() => setShowEditor(false)}
          onSave={() => {
            setShowEditor(false);
            loadTemplates();
          }}
        />
      )}

      {previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
};

export default Templates;