import React, { useState, useEffect } from 'react';
import { Save, TestTube, Server, CheckCircle, XCircle, X } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { dbService } from '../lib/db';
import type { ApiConfig } from '../types';
import { apiService } from '../services/apiService';

const Settings: React.FC = () => {
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [currentConfig, setCurrentConfig] = useState<Partial<ApiConfig>>({
    name: '',
    provider: 'moonshot',
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    apiKey: '',
    model: 'kimi-k2-0711-preview',
    maxTokens: 4096,
    temperature: 0.7,
    isDefault: true,
  });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    const configs = await dbService.getApiConfigs();
    setApiConfigs(configs);
    
    const defaultConfig = configs.find(c => c.isDefault);
    if (defaultConfig) {
      setCurrentConfig(defaultConfig);
    }
  };

  const handleProviderChange = (provider: string) => {
    const endpoints: Record<string, string> = {
      openai: 'https://api.openai.com/v1/chat/completions',
      anthropic: 'https://api.anthropic.com/v1/messages',
      moonshot: 'https://api.moonshot.cn/v1/chat/completions',
      custom: '',
    };

    const models: Record<string, string> = {
      openai: 'gpt-3.5-turbo',
      anthropic: 'claude-3-sonnet-20240229',
      moonshot: 'kimi-k2-0711-preview',
      custom: '',
    };

    setCurrentConfig({
      ...currentConfig,
      provider: provider as any,
      endpoint: endpoints[provider],
      model: models[provider],
    });
  };

  const handleSave = async () => {
    if (!currentConfig.name || !currentConfig.apiKey) {
      alert('请填写配置名称和API密钥');
      return;
    }

    if (currentConfig.id) {
      await dbService.updateApiConfig(currentConfig.id, currentConfig as ApiConfig);
    } else {
      await dbService.saveApiConfig(currentConfig as Omit<ApiConfig, 'id' | 'createdAt'>);
    }

    loadConfigs();
    alert('配置已保存');
  };

  const handleTest = async () => {
    if (!currentConfig.apiKey) {
      setTestResult({ success: false, message: '请先填写API密钥' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const success = await apiService.testConnection(currentConfig as ApiConfig);
      setTestResult({
        success,
        message: success ? 'API连接成功！' : 'API连接失败，请检查配置',
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: `连接失败: ${error.message}`,
      });
    }

    setIsTesting(false);
  };

  const handleSelectConfig = (config: ApiConfig) => {
    setCurrentConfig(config);
    setTestResult(null);
  };

  const handleDeleteConfig = async (id: string) => {
    if (confirm('确定要删除这个配置吗？')) {
      await dbService.deleteApiConfig(id);
      loadConfigs();
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">系统设置</h1>
        <p className="text-gray-400">配置API和系统参数</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="API配置" description="配置大模型API连接参数">
            <div className="space-y-4">
              <Input
                label="配置名称"
                value={currentConfig.name}
                onChange={(e) => setCurrentConfig({ ...currentConfig, name: e.target.value })}
                placeholder="例如：Kimi K2 测试环境"
              />

              <Select
                label="API提供商"
                value={currentConfig.provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                options={[
                  { value: 'openai', label: 'OpenAI' },
                  { value: 'anthropic', label: 'Anthropic' },
                  { value: 'moonshot', label: 'Moonshot (Kimi)' },
                  { value: 'custom', label: '自定义' },
                ]}
              />

              <Input
                label="API端点"
                value={currentConfig.endpoint}
                onChange={(e) => setCurrentConfig({ ...currentConfig, endpoint: e.target.value })}
                placeholder="https://api.example.com/v1/chat/completions"
              />

              <Input
                label="API密钥"
                type="password"
                value={currentConfig.apiKey}
                onChange={(e) => setCurrentConfig({ ...currentConfig, apiKey: e.target.value })}
                placeholder="sk-..."
              />

              <Input
                label="模型名称"
                value={currentConfig.model}
                onChange={(e) => setCurrentConfig({ ...currentConfig, model: e.target.value })}
                placeholder="例如：gpt-3.5-turbo"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="最大Token数"
                  type="number"
                  value={currentConfig.maxTokens}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, maxTokens: parseInt(e.target.value) })}
                />

                <Input
                  label="温度参数"
                  type="number"
                  step="0.1"
                  value={currentConfig.temperature}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, temperature: parseFloat(e.target.value) })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={currentConfig.isDefault}
                  onChange={(e) => setCurrentConfig({ ...currentConfig, isDefault: e.target.checked })}
                />
                <label htmlFor="isDefault" className="text-sm text-gray-300">
                  设为默认配置
                </label>
              </div>

              {testResult && (
                <div className={`p-4 rounded-lg flex items-center space-x-3 ${
                  testResult.success ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'
                }`}>
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className={testResult.success ? 'text-green-400' : 'text-red-400'}>
                    {testResult.message}
                  </span>
                </div>
              )}

              <div className="flex space-x-3">
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 flex-shrink-0" />
                  保存配置
                </Button>
                <Button variant="secondary" onClick={handleTest} loading={isTesting}>
                  <TestTube className="w-4 h-4 flex-shrink-0" />
                  测试连接
                </Button>
              </div>
            </div>
          </Card>

          <Card title="Kimi K2 API 配置说明" className="mt-6">
            <div className="space-y-3 text-sm text-gray-300">
              <p>使用提供的Kimi K2 API配置：</p>
              <div className="bg-dark-bg p-3 rounded-lg font-mono text-xs">
                <p>API Key: sk-KUUvvvlJ13yJiSKSeNSVtrSAMVMwdVZkamkeTDnDQceFiojq</p>
                <p>Base URL: https://api.moonshot.cn/v1</p>
                <p>Model: kimi-k2-0711-preview</p>
              </div>
              <p className="text-yellow-400">
                注意：请妥善保管API密钥，避免泄露。建议创建专用的测试密钥。
              </p>
            </div>
          </Card>
        </div>

        <div>
          <Card title="已保存配置">
            <div className="space-y-2">
              {apiConfigs.map((config) => (
                <div
                  key={config.id}
                  className={`p-3 bg-dark-bg rounded-lg cursor-pointer hover:bg-dark-border ${
                    currentConfig.id === config.id ? 'border border-accent-red' : ''
                  }`}
                  onClick={() => handleSelectConfig(config)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{config.name}</p>
                      <p className="text-xs text-gray-400">{config.provider} - {config.model}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {config.isDefault && (
                        <Badge variant="info" size="sm">默认</Badge>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConfig(config.id!);
                        }}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {apiConfigs.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无配置</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="快速配置" className="mt-6">
            <div className="space-y-2">
              <button
                onClick={() => {
                  setCurrentConfig({
                    name: 'Kimi K2 默认配置',
                    provider: 'moonshot',
                    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
                    apiKey: 'sk-KUUvvvlJ13yJiSKSeNSVtrSAMVMwdVZkamkeTDnDQceFiojq',
                    model: 'kimi-k2-0711-preview',
                    maxTokens: 4096,
                    temperature: 0.7,
                    isDefault: true,
                  });
                }}
                className="w-full p-3 bg-dark-bg rounded-lg text-left hover:bg-dark-border transition-colors"
              >
                <p className="text-white font-medium">使用Kimi K2配置</p>
                <p className="text-xs text-gray-400">快速配置提供的API密钥</p>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;