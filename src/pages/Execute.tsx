import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, XCircle, Clock, Settings, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { dbService } from '../lib/db';
import type { TestTemplate, TestResult, ApiConfig } from '../types';
import { promptGenerator } from '../services/promptGenerator';
import { apiService } from '../services/apiService';

const Execute: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [apiConfig, setApiConfig] = useState<ApiConfig | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [testQueue, setTestQueue] = useState<any[]>([]);
  const [currentTest, setCurrentTest] = useState<any>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [useMockMode, setUseMockMode] = useState(true); // 默认使用模拟模式

  useEffect(() => {
    loadData();
    
    // 监听页面焦点，当从设置页面返回时重新加载API配置
    const handleFocus = () => {
      loadApiConfig();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadData = async () => {
    const templatesData = await dbService.getAllTemplates();
    setTemplates(templatesData);
    
    const config = await dbService.getDefaultApiConfig();
    setApiConfig(config || null);
  };

  const loadApiConfig = async () => {
    const config = await dbService.getDefaultApiConfig();
    console.log('加载的API配置:', config);
    setApiConfig(config || null);
  };

  const handleSelectAll = () => {
    if (selectedTemplates.length === templates.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(templates.map(t => t.id!));
    }
  };

  const handleTemplateToggle = (templateId: string) => {
    if (selectedTemplates.includes(templateId)) {
      setSelectedTemplates(selectedTemplates.filter(id => id !== templateId));
    } else {
      setSelectedTemplates([...selectedTemplates, templateId]);
    }
  };

  const startTesting = async () => {
    if (selectedTemplates.length === 0) {
      alert('请选择至少一个模板');
      return;
    }

    if (!useMockMode && (!apiConfig || !apiConfig.apiKey)) {
      alert('请先配置API密钥或启用模拟模式');
      return;
    }
    
    // 如果是模拟模式，创建一个临时配置
    const testConfig = useMockMode ? 
      { name: '模拟模式', provider: 'mock' as const, endpoint: '', apiKey: 'test', model: 'mock' } :
      apiConfig!

    const session = await dbService.createSession({
      name: `测试会话 ${new Date().toLocaleString()}`,
      description: `测试 ${selectedTemplates.length} 个模板`,
      createdAt: new Date(),
      updatedAt: new Date(),
      totalTests: selectedTemplates.length,
      completedTests: 0,
      vulnerableTests: 0,
      status: 'running',
    });

    setSessionId(session as string);
    setIsRunning(true);
    setIsPaused(false);

    const queue: any[] = [];
    for (const templateId of selectedTemplates) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        console.log('生成测试用例，模板:', template.name);
        const prompts = promptGenerator.generateFromTemplate(template);
        console.log(`生成了 ${prompts.length} 个测试用例`);
        
        prompts.forEach(prompt => {
          queue.push({
            templateId,
            templateName: template.name,
            template: template,  // 添加完整的模板对象
            prompt,
            status: 'pending',
          });
        });
      }
    }

    console.log(`总共生成 ${queue.length} 个测试任务`);
    setTestQueue(queue);
    
    // 使用setTimeout确保状态更新后再执行
    setTimeout(() => {
      executeQueue(queue, session as string, testConfig);
    }, 100);
  };

  const executeQueue = async (queue: any[], sessionId: string, config: any) => {
    for (let i = 0; i < queue.length; i++) {
      // 检查是否应该停止执行
      if (isPaused) {
        console.log('测试已暂停');
        break;
      }

      const test = queue[i];
      console.log(`执行测试 ${i + 1}/${queue.length}:`, test.templateName);
      setCurrentTest(test);

      const startTime = Date.now();
      
      try {
        console.log('发送请求到API...');
        const response = await apiService.sendPrompt(test.prompt, config);
        const executionTime = Date.now() - startTime;
        console.log('收到响应:', response);
        
        const isVulnerable = promptGenerator.checkVulnerability(response, test.template);
        
        const result: TestResult = {
          templateId: test.templateId,
          templateName: test.templateName,
          prompt: test.prompt,
          response,
          isVulnerable,
          confidenceScore: isVulnerable ? 0.8 : 0.2,
          executionTime,
          timestamp: new Date(),
          apiUsed: config.name,
          detectedPatterns: [],
          status: 'completed',
        };

        await dbService.addTestResult(result);
        setResults(prev => [...prev, result]);

        queue[i].status = 'completed';
        setTestQueue([...queue]);

        await dbService.updateSession(sessionId, {
          completedTests: i + 1,
          vulnerableTests: results.filter(r => r.isVulnerable).length + (isVulnerable ? 1 : 0),
        });
      } catch (error: any) {
        console.error('测试执行失败:', error);
        queue[i].status = 'failed';
        queue[i].error = error.message || '未知错误';
        setTestQueue([...queue]);
        
        // 显示错误信息
        alert(`测试失败: ${error.message || '未知错误'}`);
      }
    }

    setIsRunning(false);
    setCurrentTest(null);
    await dbService.updateSession(sessionId, { status: 'completed' });
  };

  const pauseTesting = () => {
    setIsPaused(true);
    setIsRunning(false);
  };

  const resumeTesting = () => {
    setIsPaused(false);
    setIsRunning(true);
    const pendingQueue = testQueue.filter(t => t.status === 'pending');
    
    // 获取当前的配置
    const testConfig = useMockMode ? 
      { name: '模拟模式', provider: 'mock' as const, endpoint: '', apiKey: 'test', model: 'mock' } :
      apiConfig!;
    
    executeQueue(pendingQueue, sessionId, testConfig);
  };

  const resetTesting = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTestQueue([]);
    setCurrentTest(null);
    setResults([]);
    setSelectedTemplates([]);
  };

  const completedCount = testQueue.filter(t => t.status === 'completed').length;
  const failedCount = testQueue.filter(t => t.status === 'failed').length;
  const pendingCount = testQueue.filter(t => t.status === 'pending').length;
  const progress = testQueue.length > 0 ? (completedCount / testQueue.length) * 100 : 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">批量测试执行</h1>
        <p className="text-gray-400">选择模板并执行批量安全测试</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            title="测试模板选择"
            description="选择要执行的测试模板"
            actions={
              <div className="flex space-x-2">
                <Button size="sm" variant="ghost" onClick={handleSelectAll}>
                  {selectedTemplates.length === templates.length ? '取消全选' : '全选'}
                </Button>
                <Badge>{selectedTemplates.length} / {templates.length}</Badge>
              </div>
            }
          >
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {templates.map((template) => (
                <label
                  key={template.id}
                  className="flex items-center p-3 bg-dark-bg rounded-lg hover:bg-dark-border cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTemplates.includes(template.id!)}
                    onChange={() => handleTemplateToggle(template.id!)}
                    className="mr-3"
                    disabled={isRunning}
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium">{template.name}</p>
                    <p className="text-sm text-gray-400">{template.description}</p>
                  </div>
                  <Badge variant={
                    template.riskLevel === 'critical' || template.riskLevel === 'high' ? 'danger' :
                    template.riskLevel === 'medium' ? 'warning' : 'success'
                  }>
                    {template.riskLevel}
                  </Badge>
                </label>
              ))}
            </div>
          </Card>

          <Card title="执行进度" className="mt-6">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">总进度</span>
                <span className="text-white">{completedCount} / {testQueue.length}</span>
              </div>
              <div className="w-full bg-dark-bg rounded-full h-3">
                <div
                  className="bg-accent-red h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{completedCount}</p>
                  <p className="text-xs text-gray-400">已完成</p>
                </div>
                <div className="text-center">
                  <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{failedCount}</p>
                  <p className="text-xs text-gray-400">失败</p>
                </div>
                <div className="text-center">
                  <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{pendingCount}</p>
                  <p className="text-xs text-gray-400">待执行</p>
                </div>
              </div>

              {currentTest && (
                <div className="mt-4 p-3 bg-dark-bg rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">当前测试</p>
                  <p className="text-white">{currentTest.templateName}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div>
          <Card 
            title="测试控制"
            actions={
              <Badge variant={selectedTemplates.length > 0 ? "success" : "default"}>
                已选: {selectedTemplates.length}
              </Badge>
            }
          >
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-200">
                    API配置
                  </label>
                  <button
                    onClick={loadApiConfig}
                    className="p-1 hover:bg-dark-border rounded transition-colors"
                    title="刷新配置"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-400 hover:text-white" />
                  </button>
                </div>
                <div className="p-3 bg-dark-bg rounded-lg mb-2">
                  {apiConfig ? (
                    <div>
                      <p className="text-white font-medium">{apiConfig.name}</p>
                      <p className="text-sm text-gray-400">{apiConfig.model || apiConfig.provider}</p>
                      {!apiConfig.apiKey && (
                        <p className="text-sm text-yellow-500 mt-1">⚠️ 未配置API密钥</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400">请先配置API</p>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  前往设置页面配置
                </Button>
                
                <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useMockMode}
                      onChange={(e) => {
                        setUseMockMode(e.target.checked);
                        apiService.setMockMode(e.target.checked);
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-yellow-400">使用模拟模式（无需API密钥）</span>
                  </label>
                  {useMockMode && (
                    <p className="text-xs text-yellow-300 mt-1">
                      模拟模式将返回测试响应，不会实际调用API
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                {!isRunning && !isPaused && (
                  <>
                    <Button 
                      onClick={startTesting} 
                      disabled={selectedTemplates.length === 0 || (!useMockMode && (!apiConfig || !apiConfig.apiKey))}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      开始测试
                    </Button>
                    {selectedTemplates.length === 0 && (
                      <p className="text-xs text-yellow-500 text-center">请先选择测试模板</p>
                    )}
                    {selectedTemplates.length > 0 && !useMockMode && (!apiConfig || !apiConfig.apiKey) && (
                      <p className="text-xs text-yellow-500 text-center">请先配置API密钥或启用模拟模式</p>
                    )}
                  </>
                )}
                
                {isRunning && !isPaused && (
                  <Button onClick={pauseTesting} variant="secondary">
                    <Pause className="w-4 h-4 mr-2" />
                    暂停测试
                  </Button>
                )}
                
                {!isRunning && isPaused && (
                  <Button onClick={resumeTesting}>
                    <Play className="w-4 h-4 mr-2" />
                    继续测试
                  </Button>
                )}
                
                {(isRunning || isPaused || testQueue.length > 0) && (
                  <Button onClick={resetTesting} variant="danger">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    重置
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Card title="测试结果摘要" className="mt-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">发现漏洞</span>
                <span className="text-accent-red font-bold">
                  {results.filter(r => r.isVulnerable).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">安全通过</span>
                <span className="text-green-500 font-bold">
                  {results.filter(r => !r.isVulnerable).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">平均响应时间</span>
                <span className="text-white">
                  {results.length > 0
                    ? Math.round(results.reduce((a, b) => a + b.executionTime, 0) / results.length)
                    : 0} ms
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Execute;