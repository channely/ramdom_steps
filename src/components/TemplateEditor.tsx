import React, { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2, Copy, RefreshCw, AlertCircle } from "lucide-react";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Select from "./ui/Select";
import Badge from "./ui/Badge";
import VariableSelector from "./VariableSelector";
import type { TestTemplate, TemplateVariable } from "../types";
import { ATTACK_CATEGORIES } from "../types";
import { dbService } from "../lib/db";
import { variableDataGenerator } from "../services/variableDataGenerator";

interface TemplateEditorProps {
  template?: TestTemplate | null;
  onClose: () => void;
  onSave: () => void;
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  onClose,
  onSave,
}) => {
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [formData, setFormData] = useState<Partial<TestTemplate>>({
    name: "",
    description: "",
    category: ATTACK_CATEGORIES[0].id,
    subcategory: ATTACK_CATEGORIES[0].subcategories[0],
    riskLevel: "medium",
    template: "",
    variables: [],
    tags: [],
    successCriteria: {
      type: "keywords",
      keywords: [],
      threshold: 0.5,
    },
    version: "1.0.0",
  });

  const [tagInput, setTagInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [detectedVariables, setDetectedVariables] = useState<
    {
      name: string;
      isGlobal: boolean;
    }[]
  >([]);

  useEffect(() => {
    if (template) {
      setFormData(template);
    }
  }, [template]);

  // 检测模板中的变量并自动分类
  useEffect(() => {
    const variablePattern = /\{([^}]+)\}/g;
    const detected: { name: string; isGlobal: boolean }[] = [];
    const seen = new Set<string>();
    let match;

    while ((match = variablePattern.exec(formData.template || "")) !== null) {
      const varName = match[1];
      if (!seen.has(varName)) {
        seen.add(varName);
        // 检查是否是全局变量
        const isGlobal = variableDataGenerator.hasVariable(varName);
        detected.push({ name: varName, isGlobal });
      }
    }

    setDetectedVariables(detected);

    // 自动配置变量
    const globalVars = detected.filter((v) => v.isGlobal).map((v) => v.name);
    const privateVars = detected.filter((v) => !v.isGlobal).map((v) => v.name);

    const newTemplateVariables = {
      global: globalVars,
      private: formData.templateVariables?.private || {},
    };

    // 为新检测到的私有变量初始化空数组
    privateVars.forEach((varName) => {
      if (!newTemplateVariables.private![varName]) {
        newTemplateVariables.private![varName] = [""];
      }
    });

    // 清理不存在的私有变量
    if (newTemplateVariables.private) {
      Object.keys(newTemplateVariables.private).forEach((varName) => {
        if (!privateVars.includes(varName)) {
          delete newTemplateVariables.private![varName];
        }
      });
    }

    setFormData((prev) => ({
      ...prev,
      templateVariables: newTemplateVariables,
    }));
  }, [formData.template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (template?.id) {
      await dbService.updateTemplate(template.id, formData);
    } else {
      await dbService.addTemplate(
        formData as Omit<TestTemplate, "id" | "createdAt" | "lastUpdated">,
      );
    }

    onSave();
  };

  // 更新私有变量的值
  const updatePrivateVariableValues = (varName: string, values: string[]) => {
    const templateVars = { ...formData.templateVariables };
    if (!templateVars.private) templateVars.private = {};
    templateVars.private[varName] = values;
    setFormData({ ...formData, templateVariables: templateVars });
  };

  // 获取全局变量的示例值（只读展示）
  const getGlobalVariableValues = (varName: string): string[] => {
    if (!variableDataGenerator.hasVariable(varName)) return [];
    // 获取几个示例值用于展示
    const samples = new Set<string>();
    for (let i = 0; i < 5 && samples.size < 3; i++) {
      samples.add(variableDataGenerator.getRandomValue(varName));
    }
    return Array.from(samples);
  };

  const addVariable = () => {
    const newVariable: TemplateVariable = {
      name: "",
      type: "text",
      label: "",
      required: false,
      defaultValue: "",
    };

    setFormData({
      ...formData,
      variables: [...(formData.variables || []), newVariable],
    });
  };

  const updateVariable = (
    index: number,
    updates: Partial<TemplateVariable>,
  ) => {
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
      setTagInput("");
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
          keywords: [
            ...(formData.successCriteria?.keywords || []),
            keywordInput.trim(),
          ],
        },
      });
      setKeywordInput("");
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

  const selectedCategory = ATTACK_CATEGORIES.find(
    (c) => c.id === formData.category,
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-surface border border-dark-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <h2 className="text-xl font-semibold text-white">
            {template ? "编辑模板" : "创建新模板"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-border rounded"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="模板名称"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />

            <Input
              label="版本号"
              value={formData.version}
              onChange={(e) =>
                setFormData({ ...formData, version: e.target.value })
              }
              required
            />

            <div className="md:col-span-2">
              <Input
                label="描述"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />
            </div>

            <Select
              label="攻击类别"
              value={formData.category}
              onChange={(e) => {
                const category = ATTACK_CATEGORIES.find(
                  (c) => c.id === e.target.value,
                );
                setFormData({
                  ...formData,
                  category: e.target.value,
                  subcategory: category?.subcategories[0] || "",
                });
              }}
              options={ATTACK_CATEGORIES.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />

            <Select
              label="子类别"
              value={formData.subcategory}
              onChange={(e) =>
                setFormData({ ...formData, subcategory: e.target.value })
              }
              options={
                selectedCategory?.subcategories.map((s) => ({
                  value: s,
                  label: s,
                })) || []
              }
            />

            <Select
              label="风险等级"
              value={formData.riskLevel}
              onChange={(e) =>
                setFormData({ ...formData, riskLevel: e.target.value as any })
              }
              options={[
                { value: "low", label: "低风险" },
                { value: "medium", label: "中风险" },
                { value: "high", label: "高风险" },
                { value: "critical", label: "严重风险" },
              ]}
            />

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-200">
                  模板内容
                </label>
                <div className="flex items-center gap-2">
                  <VariableSelector
                    onInsert={(variable) => {
                      const textarea = templateTextareaRef.current;
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const text = formData.template || "";
                        const newText =
                          text.substring(0, start) +
                          variable +
                          text.substring(end);
                        setFormData({ ...formData, template: newText });
                        // 设置光标位置到插入变量后
                        setTimeout(() => {
                          textarea.selectionStart = textarea.selectionEnd =
                            start + variable.length;
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
                onChange={(e) =>
                  setFormData({ ...formData, template: e.target.value })
                }
                className="w-full h-32 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-red font-mono text-sm"
                placeholder="输入模板内容，使用 {变量名} 格式插入变量"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-200 mb-3 block">
                模板变量配置
                <span className="text-xs text-gray-500 ml-2">
                  （变量在模板内容中用 {`{变量名}`} 声明）
                </span>
              </label>

              {/* 变量列表 */}
              {detectedVariables.length > 0 ? (
                <div className="space-y-3">
                  {detectedVariables.map(({ name: varName, isGlobal }) => (
                    <div key={varName} className="p-3 bg-dark-bg rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <code className="text-accent-red font-mono">{`{${varName}}`}</code>
                          <Badge
                            size="sm"
                            variant={isGlobal ? "info" : "warning"}
                          >
                            {isGlobal ? "全局复用" : "私有专用"}
                          </Badge>
                        </div>
                      </div>

                      {isGlobal ? (
                        // 全局变量 - 只读展示
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 mb-1">
                            示例值（不可修改，随机生成）：
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {getGlobalVariableValues(varName).map(
                              (value, idx) => (
                                <Badge key={idx} variant="secondary" size="sm">
                                  {value}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      ) : (
                        // 私有变量 - 可编辑
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 mb-1">
                            枚举值（必须至少填写一个）：
                          </p>
                          {(
                            formData.templateVariables?.private?.[varName] || [
                              "",
                            ]
                          ).map((value, idx) => (
                            <div key={idx} className="flex gap-1">
                              <Input
                                size="sm"
                                value={value}
                                onChange={(e) => {
                                  const currentValues = formData
                                    .templateVariables?.private?.[varName] || [
                                    "",
                                  ];
                                  const newValues = [...currentValues];
                                  newValues[idx] = e.target.value;
                                  updatePrivateVariableValues(
                                    varName,
                                    newValues,
                                  );
                                }}
                                placeholder="输入变量值"
                                required
                              />
                              {(formData.templateVariables?.private?.[varName]
                                ?.length || 0) > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentValues =
                                      formData.templateVariables?.private?.[
                                        varName
                                      ] || [];
                                    const newValues = currentValues.filter(
                                      (_, i) => i !== idx,
                                    );
                                    updatePrivateVariableValues(
                                      varName,
                                      newValues,
                                    );
                                  }}
                                  className="p-1 hover:bg-dark-border rounded"
                                >
                                  <X className="w-3 h-3 text-gray-400" />
                                </button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const currentValues = formData.templateVariables
                                ?.private?.[varName] || [""];
                              updatePrivateVariableValues(varName, [
                                ...currentValues,
                                "",
                              ]);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            添加值
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-dark-bg rounded-lg text-center text-gray-400 text-sm">
                  模板中暂无变量，在模板内容中使用 {`{varName}`} 格式声明变量
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-200 mb-2">
                标签
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="输入标签"
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addTag())
                  }
                />
                <Button type="button" size="sm" onClick={addTag}>
                  添加
                </Button>
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
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addKeyword())
                  }
                />
                <Button type="button" size="sm" onClick={addKeyword}>
                  添加
                </Button>
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
            <Button type="submit">{template ? "保存更改" : "创建模板"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateEditor;
