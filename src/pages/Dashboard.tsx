import React, { useEffect, useState } from 'react';
import { AlertTriangle, FileText, Play, TrendingUp, Clock } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { dbService } from '../lib/db';
import type { TestResult } from '../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalTemplates: 0,
    totalTests: 0,
    vulnerableTests: 0,
    recentTests: [] as TestResult[],
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const templates = await dbService.getAllTemplates();
    const results = await dbService.getTestResults(10);
    const vulnerableCount = results.filter(r => r.isVulnerable).length;

    setStats({
      totalTemplates: templates.length,
      totalTests: results.length,
      vulnerableTests: vulnerableCount,
      recentTests: results.slice(0, 5),
    });
  };


  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">安全测试控制台</h1>
        <p className="text-gray-400">监控和管理Prompt越狱安全测试</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-dark-surface to-dark-bg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">测试模板</p>
              <p className="text-2xl font-bold text-white">{stats.totalTemplates}</p>
              <p className="text-xs text-gray-500 mt-1">可用模板</p>
            </div>
            <FileText className="w-10 h-10 text-accent-blue opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-dark-surface to-dark-bg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">执行测试</p>
              <p className="text-2xl font-bold text-white">{stats.totalTests}</p>
              <p className="text-xs text-gray-500 mt-1">总计</p>
            </div>
            <Play className="w-10 h-10 text-accent-green opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-dark-surface to-dark-bg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">发现漏洞</p>
              <p className="text-2xl font-bold text-accent-red">{stats.vulnerableTests}</p>
              <p className="text-xs text-gray-500 mt-1">高危风险</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-accent-red opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-dark-surface to-dark-bg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">成功率</p>
              <p className="text-2xl font-bold text-accent-yellow">
                {stats.totalTests > 0 
                  ? Math.round((stats.vulnerableTests / stats.totalTests) * 100) 
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">越狱成功</p>
            </div>
            <TrendingUp className="w-10 h-10 text-accent-yellow opacity-50" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="最近测试结果"
          description="最新执行的安全测试记录"
        >
          {stats.recentTests.length > 0 ? (
            <div className="space-y-3">
              {stats.recentTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-3 bg-dark-bg rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-white font-medium">{test.templateName}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(test.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={test.isVulnerable ? 'danger' : 'success'}>
                      {test.isVulnerable ? '存在漏洞' : '安全'}
                    </Badge>
                    <span className="text-sm text-gray-400">
                      {test.executionTime}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无测试记录</p>
            </div>
          )}
        </Card>

        <Card
          title="攻击类型分布"
          description="各类越狱技术使用统计"
        >
          <div className="space-y-3">
            {['角色扮演', '指令注入', '编码混淆', '上下文操纵'].map((type, index) => {
              const colors = ['bg-accent-red', 'bg-accent-yellow', 'bg-accent-green', 'bg-accent-blue'];
              const percentages = [35, 25, 20, 20];
              
              return (
                <div key={type}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-300">{type}</span>
                    <span className="text-sm text-gray-400">{percentages[index]}%</span>
                  </div>
                  <div className="w-full bg-dark-bg rounded-full h-2">
                    <div
                      className={`${colors[index]} h-2 rounded-full`}
                      style={{ width: `${percentages[index]}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;