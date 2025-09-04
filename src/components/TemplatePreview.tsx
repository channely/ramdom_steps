import React, { useState } from 'react';
import { Eye, RefreshCw, Copy, X } from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Card from './ui/Card';
import type { TestTemplate } from '../types';
import { promptGenerator } from '../services/promptGenerator';
import { dbService } from '../lib/db';

interface TemplatePreviewProps {
  template: TestTemplate;
  onClose: () => void;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ template, onClose }) => {
  const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  // 生成预览
  const generatePreview = async () => {
    // 生成3个变体
    const prompts = await promptGenerator.generateFromTemplateAsync(template, { 
      variations: 3, 
      randomize: false 
    });
    setGeneratedPrompts(prompts);
    
    // 收集所有使用的变量及其值
    const variables: Record<string, string> = {};
    const variablePattern = /\{([^}]+)\}/g;
    
    // 从模板中提取所有变量名
    const matches = template.template.matchAll(variablePattern);
    const allVariables = await dbService.getAllCustomVariables();
    const varMap = new Map(allVariables.map(v => [v.name, v]));
    
    for (const match of matches) {
      const varName = match[1];
      if (!variables[varName]) {
        const dbVar = varMap.get(varName);
        if (dbVar && dbVar.values && dbVar.values.length > 0) {
          variables[varName] = dbVar.values[Math.floor(Math.random() * dbVar.values.length)];
        } else if (template.templateVariables?.private && template.templateVariables.private[varName]) {
          const values = template.templateVariables.private[varName];
          if (values && values.length > 0) {
            variables[varName] = values[Math.floor(Math.random() * values.length)];
          } else {
            variables[varName] = `[${varName}]`;
          }
        } else {
          variables[varName] = `[${varName}]`;
        }
      }
    }
    
    setVariableValues(variables);
  };

  // 初始生成
  React.useEffect(() => {
    generatePreview();
  }, []);

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    alert('已复制到剪贴板');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-surface rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">模板预览</h2>
            <p className="text-gray-400">{template.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={generatePreview}
            >
              <RefreshCw className="w-4 h-4 flex-shrink-0" />
              重新生成
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：模板信息和变量值 */}
            <div className="space-y-6">
              <Card title="模板信息">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">类别</p>
                    <Badge>{template.category}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">风险等级</p>
                    <Badge variant={
                      template.riskLevel === 'critical' || template.riskLevel === 'high' ? 'danger' :
                      template.riskLevel === 'medium' ? 'warning' : 'success'
                    }>
                      {template.riskLevel}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">描述</p>
                    <p className="text-gray-300">{template.description}</p>
                  </div>
                </div>
              </Card>

              <Card title="变量值">
                <div className="space-y-2">
                  {Object.keys(variableValues).length > 0 ? (
                    Object.entries(variableValues).map(([name, value]) => (
                      <div key={name} className="flex items-start gap-2">
                        <code className="text-accent-red text-sm font-mono min-w-[120px]">
                          {`{${name}}`}
                        </code>
                        <span className="text-gray-400">→</span>
                        <span className="text-gray-300 text-sm flex-1 break-all">
                          {value}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">该模板不包含变量</p>
                  )}
                </div>
              </Card>

              <Card title="原始模板">
                <div className="p-3 bg-dark-bg rounded-lg">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                    {template.template}
                  </pre>
                </div>
              </Card>
            </div>

            {/* 右侧：生成的提示词 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">生成的测试提示词</h3>
              
              {generatedPrompts.map((prompt, idx) => (
                <div 
                  key={idx} 
                  className="hover:bg-dark-border transition-colors cursor-pointer"
                  onClick={() => setSelectedPrompt(prompt === selectedPrompt ? null : prompt)}
                >
                <Card>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge size="sm">变体 {idx + 1}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyPrompt(prompt);
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className={`transition-all ${
                      selectedPrompt === prompt ? '' : 'max-h-32 overflow-hidden'
                    }`}>
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                        {prompt}
                      </pre>
                      {selectedPrompt !== prompt && prompt.length > 200 && (
                        <div className="mt-2 text-xs text-gray-500">
                          点击展开全文...
                        </div>
                      )}
                    </div>

                    {/* 高亮显示替换后的变量 */}
                    {selectedPrompt === prompt && (
                      <div className="pt-3 border-t border-dark-border">
                        <p className="text-xs text-gray-400 mb-2">已替换的变量：</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.keys(variableValues).map(varName => (
                            <Badge key={varName} size="sm" variant="default">
                              {varName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
                </div>
              ))}

              <div className="p-4 bg-dark-bg rounded-lg">
                <div className="flex items-start gap-2">
                  <Eye className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div className="text-xs text-gray-400">
                    <p>这些是基于模板生成的实际测试提示词。</p>
                    <p className="mt-1">每次生成时，变量值都会随机变化。</p>
                    <p className="mt-1">点击"重新生成"可以查看不同的变体。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;