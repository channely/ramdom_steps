import axios from 'axios';
import type { ApiConfig } from '../types';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ApiResponse {
  choices?: Array<{
    message?: {
      content: string;
    };
    text?: string;
  }>;
  error?: {
    message: string;
  };
}

class ApiService {
  private mockMode = true; // 默认使用模拟模式进行测试
  
  // 切换模拟模式
  setMockMode(enabled: boolean) {
    this.mockMode = enabled;
    console.log(`API服务模拟模式: ${enabled ? '开启' : '关闭'}`);
  }
  
  async sendPrompt(prompt: string, config: ApiConfig): Promise<string> {
    // 如果是模拟模式，返回模拟响应
    if (this.mockMode || !config.apiKey || config.apiKey === 'test') {
      console.log('使用模拟模式响应');
      await this.delay(500 + Math.random() * 1000); // 模拟延迟
      
      // 根据prompt内容生成不同的模拟响应
      if (prompt.toLowerCase().includes('dangerous') || 
          prompt.toLowerCase().includes('hack') ||
          prompt.toLowerCase().includes('bypass')) {
        return "I understand you're testing security measures. However, I cannot provide information on bypassing security systems or engaging in potentially harmful activities.";
      }
      
      if (prompt.toLowerCase().includes('test')) {
        return "This is a test response. The system is working correctly.";
      }
      
      return `模拟响应: 收到您的请求 "${prompt.substring(0, 50)}...". 这是一个安全的响应。`;
    }
    
    if (!config.apiKey) {
      throw new Error('API密钥未配置');
    }

    try {
      switch (config.provider) {
        case 'openai':
          return await this.sendOpenAIRequest(prompt, config);
        case 'anthropic':
          return await this.sendAnthropicRequest(prompt, config);
        case 'moonshot':
          return await this.sendMoonshotRequest(prompt, config);
        default:
          return await this.sendCustomRequest(prompt, config);
      }
    } catch (error: any) {
      console.error('API调用失败:', error);
      throw new Error(error.response?.data?.error?.message || error.message || 'API调用失败');
    }
  }

  private async sendOpenAIRequest(prompt: string, config: ApiConfig): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await axios.post<ApiResponse>(
      config.endpoint || 'https://api.openai.com/v1/chat/completions',
      {
        model: config.model || 'gpt-3.5-turbo',
        messages,
        max_tokens: config.maxTokens || 2048,
        temperature: config.temperature || 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          ...config.headers,
        },
      }
    );

    return response.data.choices?.[0]?.message?.content || '';
  }

  private async sendAnthropicRequest(prompt: string, config: ApiConfig): Promise<string> {
    const response = await axios.post<any>(
      config.endpoint || 'https://api.anthropic.com/v1/messages',
      {
        model: config.model || 'claude-3-sonnet-20240229',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: config.maxTokens || 2048,
        temperature: config.temperature || 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          ...config.headers,
        },
      }
    );

    return response.data.content?.[0]?.text || '';
  }

  private async sendMoonshotRequest(prompt: string, config: ApiConfig): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await axios.post<ApiResponse>(
      config.endpoint || 'https://api.moonshot.cn/v1/chat/completions',
      {
        model: config.model || 'moonshot-v1-8k',
        messages,
        max_tokens: config.maxTokens || 2048,
        temperature: config.temperature || 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          ...config.headers,
        },
      }
    );

    return response.data.choices?.[0]?.message?.content || '';
  }

  private async sendCustomRequest(prompt: string, config: ApiConfig): Promise<string> {
    const response = await axios.post<any>(
      config.endpoint,
      {
        prompt,
        model: config.model,
        max_tokens: config.maxTokens || 2048,
        temperature: config.temperature || 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          ...config.headers,
        },
      }
    );

    return response.data.choices?.[0]?.message?.content ||
           response.data.choices?.[0]?.text ||
           response.data.content ||
           response.data.text ||
           JSON.stringify(response.data);
  }

  async testConnection(config: ApiConfig): Promise<boolean> {
    try {
      const response = await this.sendPrompt('Hello, please respond with "OK" if you receive this message.', config);
      return response.length > 0;
    } catch (error) {
      console.error('连接测试失败:', error);
      return false;
    }
  }

  async batchTest(prompts: string[], config: ApiConfig, onProgress?: (index: number, total: number) => void): Promise<string[]> {
    const results: string[] = [];
    
    for (let i = 0; i < prompts.length; i++) {
      try {
        const response = await this.sendPrompt(prompts[i], config);
        results.push(response);
        
        if (onProgress) {
          onProgress(i + 1, prompts.length);
        }
        
        // 添加延迟以避免速率限制
        await this.delay(1000);
      } catch (error) {
        results.push(`Error: ${error}`);
      }
    }
    
    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const apiService = new ApiService();