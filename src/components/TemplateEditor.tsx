import React, { useState, useEffect, useRef } from "react";
import { X, Plus } from "lucide-react";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Select from "./ui/Select";
import Badge from "./ui/Badge";
import VariableSelector from "./VariableSelector";
import type { TestTemplate } from "../types";
import { ATTACK_CATEGORIES } from "../types";
import { dbService } from "../lib/db";
import { detectTemplateVariables } from "../utils/variableDetector";
import { variableManager } from "../services/variableManager";

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
      scope?: 'global' | 'private';
      usageCount?: number;
    }[]
  >([]);

  const [previousDetectedVars, setPreviousDetectedVars] = useState<string[]>([]);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    if (template) {
      // 确保templateVariables被初始化
      const templateWithVariables = {
        ...template,
        templateVariables: template.templateVariables || {
          global: [],
          private: {}
        }
      };
      setFormData(templateWithVariables);
      // 初始化已检测的变量
      const initialVars = detectTemplateVariables(template.template);
      setPreviousDetectedVars(initialVars);
      setIsFirstLoad(true); // 标记为首次加载
    }
  }, [template]);

  // 检测模板中的变量并自动分类
  useEffect(() => {
    const loadVariableInfo = async () => {
      // 使用智能检测函数，避免JSON语法误识别
      const detectedVarNames = detectTemplateVariables(formData.template || "");
      
      // 从数据库获取所有变量信息
      const allVariables = await dbService.getAllCustomVariables();
      const allTemplates = await dbService.getAllTemplates();
      const varMap = new Map(allVariables.map(v => [v.name, v]));
      
      // 统计每个变量被多少个模板使用（包括当前正在编辑的模板）
      const varUsageCount = new Map<string, number>();
      
      // 统计其他模板中的变量使用
      for (const tpl of allTemplates) {
        // 跳过当前正在编辑的模板
        if (template?.id && tpl.id === template.id) continue;
        
        const tplVars = detectTemplateVariables(tpl.template);
        for (const varName of tplVars) {
          varUsageCount.set(varName, (varUsageCount.get(varName) || 0) + 1);
        }
      }
      
      // 加上当前模板中的变量
      for (const varName of detectedVarNames) {
        varUsageCount.set(varName, (varUsageCount.get(varName) || 0) + 1);
      }
      
      const detected: { name: string; isGlobal: boolean; scope?: 'global' | 'private'; usageCount: number }[] = detectedVarNames.map(varName => {
        const dbVar = varMap.get(varName);
        const usageCount = varUsageCount.get(varName) || 1;
        
        // 重新判定变量类型：
        // 只根据使用次数判定，不管是否在 variableDataGenerator 中
        // 如果被2个或以上模板使用，是公共变量
        // 否则是私有变量（即使有预定义值）
        const isGlobal = usageCount >= 2;
        
        return {
          name: varName,
          isGlobal,
          scope: isGlobal ? 'global' : 'private',
          usageCount
        };
      });

      setDetectedVariables(detected);

      // 自动配置变量
      const globalVars = detected.filter((v) => v.isGlobal).map((v) => v.name);
      const privateVars = detected.filter((v) => !v.isGlobal).map((v) => v.name);

      const newTemplateVariables = {
        global: globalVars,
        private: {} as Record<string, string[]>,
      };

      // 为所有私有变量初始化值
      for (const varName of privateVars) {
        // 总是从数据库获取值
        const dbVar = varMap.get(varName);
        console.log(`[TemplateEditor] Initializing private variable ${varName}:`, {
          dbVar: dbVar,
          isFirstLoad,
          currentTemplatePrivateVars: formData.templateVariables?.private,
          hasProperty: formData.templateVariables?.private?.hasOwnProperty(varName)
        });
        
        // 检查是否是第一次加载或者是新变量
        const isNewVariable = !formData.templateVariables?.private?.hasOwnProperty(varName);
        
        if (isFirstLoad || isNewVariable) {
          // 第一次加载或新变量：从数据库加载
          if (dbVar && dbVar.values && dbVar.values.length > 0) {
            newTemplateVariables.private![varName] = [...dbVar.values];
            console.log(`  -> [DB Load] Loaded ${dbVar.values.length} values from database:`, dbVar.values);
          } else {
            // 初始化为空值
            newTemplateVariables.private![varName] = [""];
            console.log(`  -> [Empty] No values found in database, initialized as empty`);
          }
        } else {
          // 保留用户编辑的值
          const existingValues = formData.templateVariables?.private?.[varName];
          if (existingValues && existingValues.length > 0) {
            newTemplateVariables.private![varName] = existingValues;
            console.log(`  -> [Keep] Keeping existing ${existingValues.length} values:`, existingValues);
          } else {
            newTemplateVariables.private![varName] = [""];
            console.log(`  -> [Empty] No valid existing values, initialized as empty`);
          }
        }
      }

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
      
      // 重置首次加载标志
      if (isFirstLoad) {
        setIsFirstLoad(false);
      }
    };
    
    loadVariableInfo();
  }, [formData.template, template?.id, isFirstLoad]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 获取当前模板中检测到的变量
    const currentDetectedVars = detectTemplateVariables(formData.template || "");

    if (template?.id) {
      // 更新模板
      await dbService.updateTemplate(template.id, formData);
      
      // 同步变量更新，包括私有变量的值
      await variableManager.syncTemplateVariables(
        template.id,
        previousDetectedVars,
        currentDetectedVars,
        formData.templateVariables?.private
      );
    } else {
      // 创建新模板
      const newTemplateId = await dbService.addTemplate(
        formData as Omit<TestTemplate, "id" | "createdAt" | "lastUpdated">,
      );
      
      // 为新模板同步变量，包括私有变量的值
      if (newTemplateId && typeof newTemplateId === 'string') {
        await variableManager.syncTemplateVariables(
          newTemplateId,
          [],
          currentDetectedVars,
          formData.templateVariables?.private
        );
      }
    }

    onSave();
  };

  // 更新私有变量的值
  const updatePrivateVariableValues = async (varName: string, values: string[]) => {
    const templateVars = { ...formData.templateVariables };
    if (!templateVars.private) templateVars.private = {};
    templateVars.private[varName] = values;
    setFormData({ ...formData, templateVariables: templateVars });
    
    // 同步更新变量管理器中的值
    try {
      // 获取自定义变量
      const customVars = await dbService.getAllCustomVariables();
      const customVar = customVars.find(v => v.name === varName);
      
      if (customVar && customVar.id) {
        // 更新变量值
        await variableManager.updateVariable(customVar.id, { values });
      }
    } catch (error) {
      console.error('同步私有变量值失败:', error);
    }
  };

  // 存储变量的枚举值
  const [variableValues, setVariableValues] = useState<Record<string, string[]>>({});
  
  // 加载变量的枚举值
  useEffect(() => {
    const loadVariableValues = async () => {
      const allVariables = await dbService.getAllCustomVariables();
      const values: Record<string, string[]> = {};
      
      // 先从数据库加载所有自定义变量的值（包括公共和私有）
      allVariables.forEach(v => {
        if (v.values && v.values.length > 0) {
          values[v.name] = v.values;
          console.log(`Loaded ${v.scope} variable ${v.name} from DB:`, v.values.length, 'values');
        }
      });
      
      // 对于每个检测到的变量，确保有完整的值
      detectedVariables.forEach(({ name, scope, isGlobal }) => {
        // 优先从数据库获取值
        if (!values[name] || values[name].length === 0) {
          // 私有变量从模板配置中获取
          if (scope === 'private') {
            const templatePrivateValues = formData.templateVariables?.private?.[name];
            if (templatePrivateValues && templatePrivateValues.length > 0) {
              values[name] = templatePrivateValues;
              console.log(`Loading private variable ${name} from template config:`, templatePrivateValues.length, 'values');
            } else {
              // 如果完全没有值，初始化为空数组
              values[name] = [];
              console.log(`Private variable ${name} has no values, initialized as empty`);
            }
          }
        }
      });
      
      console.log('Final loaded variable values:', values);
      setVariableValues(values);
    };
    
    if (detectedVariables.length > 0) {
      loadVariableValues();
    }
  }, [detectedVariables, formData.templateVariables]);
  
  // 获取公共变量的所有枚举值（只读展示）
  const getGlobalVariableValues = (varName: string): string[] => {
    return variableValues[varName] || [];
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
                  {detectedVariables.map(({ name: varName, isGlobal, usageCount }) => (
                    <div key={varName} className="p-3 bg-dark-bg rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <code className="text-accent-red font-mono">{`{${varName}}`}</code>
                          <Badge
                            size="sm"
                            variant={isGlobal ? "info" : "warning"}
                          >
                            {isGlobal ? "公共" : "私有"}
                          </Badge>
                          {usageCount && (
                            <span className="text-xs text-gray-500">
                              被 {usageCount} 个模板使用
                            </span>
                          )}
                        </div>
                      </div>

                      {isGlobal ? (
                        // 公共变量 - 只读展示
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 mb-1">
                            枚举值（公共变量，在变量管理中定义）：
                          </p>
                          <div className="max-h-48 overflow-y-auto border border-dark-border rounded p-2 bg-dark-bg/50">
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                const allValues = getGlobalVariableValues(varName);
                                console.log(`Variable ${varName} has ${allValues.length} values:`, allValues);
                                return allValues.length > 0 ? (
                                  allValues.map((value, idx) => (
                                    <Badge key={idx} variant="default" size="sm" className="text-xs">
                                      {value}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-gray-500 text-xs">暂无枚举值</span>
                                );
                              })()}
                            </div>
                          </div>
                          <p className="text-xs text-gray-600">
                            共 {getGlobalVariableValues(varName).length} 个枚举值 
                            {getGlobalVariableValues(varName).length > 20 && 
                              <span className="text-gray-500">（滚动查看全部）</span>
                            }
                          </p>
                        </div>
                      ) : (
                        // 私有变量 - 可编辑
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 mb-1">
                            枚举值（私有变量，可在此编辑）：
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
                                placeholder="输入或编辑变量值"
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
