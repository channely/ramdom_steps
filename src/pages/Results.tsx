import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Download, TrendingUp, AlertTriangle, Clock, BarChart as BarChartIcon } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import { dbService } from '../lib/db';
import type { TestResult } from '../types';
import { ATTACK_CATEGORIES } from '../types';

const Results: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<TestResult[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'vulnerable' | 'safe'>('all');
  const [timeRange, setTimeRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedCategory] = useState<string>('all');

  useEffect(() => {
    loadResults();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [results, filterStatus, timeRange, selectedCategory]);

  const loadResults = async () => {
    const data = await dbService.getTestResults();
    setResults(data);
  };

  const applyFilters = () => {
    let filtered = [...results];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => 
        filterStatus === 'vulnerable' ? r.isVulnerable : !r.isVulnerable
      );
    }

    if (timeRange !== 'all') {
      const now = new Date();
      const ranges = {
        today: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now.getTime() - ranges[timeRange];
      filtered = filtered.filter(r => new Date(r.timestamp).getTime() > cutoff);
    }

    setFilteredResults(filtered);
  };

  const exportResults = () => {
    const csv = [
      ['时间', '模板', 'Prompt', '响应', '是否存在漏洞', '置信度', '执行时间'],
      ...filteredResults.map(r => [
        new Date(r.timestamp).toISOString(),
        r.templateName,
        r.prompt,
        r.response.substring(0, 100),
        r.isVulnerable ? '是' : '否',
        r.confidenceScore,
        r.executionTime,
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${Date.now()}.csv`;
    a.click();
  };

  const getStatistics = () => {
    const total = filteredResults.length;
    const vulnerable = filteredResults.filter(r => r.isVulnerable).length;
    const avgTime = total > 0 
      ? filteredResults.reduce((sum, r) => sum + r.executionTime, 0) / total 
      : 0;
    const avgConfidence = total > 0
      ? filteredResults.reduce((sum, r) => sum + r.confidenceScore, 0) / total
      : 0;

    return {
      total,
      vulnerable,
      safe: total - vulnerable,
      vulnerabilityRate: total > 0 ? (vulnerable / total) * 100 : 0,
      avgTime: Math.round(avgTime),
      avgConfidence: Math.round(avgConfidence * 100),
    };
  };

  const getCategoryData = () => {
    const categoryCount: Record<string, number> = {};
    
    ATTACK_CATEGORIES.forEach(cat => {
      categoryCount[cat.name] = 0;
    });

    filteredResults.forEach(result => {
      const template = result.templateName;
      ATTACK_CATEGORIES.forEach(cat => {
        if (template.includes(cat.name)) {
          categoryCount[cat.name]++;
        }
      });
    });

    return Object.entries(categoryCount).map(([name, value]) => ({
      name,
      value,
      color: ATTACK_CATEGORIES.find(c => c.name === name)?.color || '#666',
    }));
  };

  const getTimelineData = () => {
    const timeline: Record<string, { date: string; vulnerable: number; safe: number }> = {};
    
    filteredResults.forEach(result => {
      const date = new Date(result.timestamp).toLocaleDateString();
      if (!timeline[date]) {
        timeline[date] = { date, vulnerable: 0, safe: 0 };
      }
      if (result.isVulnerable) {
        timeline[date].vulnerable++;
      } else {
        timeline[date].safe++;
      }
    });

    return Object.values(timeline).slice(-7);
  };

  const stats = getStatistics();
  const categoryData = getCategoryData();
  const timelineData = getTimelineData();

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">结果分析</h1>
            <p className="text-gray-400">分析和可视化测试结果</p>
          </div>
          <Button onClick={exportResults}>
            <Download className="w-4 h-4 mr-2" />
            导出CSV
          </Button>
        </div>
      </div>

      <div className="mb-6 flex space-x-4">
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          options={[
            { value: 'all', label: '全部结果' },
            { value: 'vulnerable', label: '存在漏洞' },
            { value: 'safe', label: '安全通过' },
          ]}
        />
        <Select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          options={[
            { value: 'all', label: '所有时间' },
            { value: 'today', label: '今天' },
            { value: 'week', label: '最近7天' },
            { value: 'month', label: '最近30天' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">总测试数</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <BarChartIcon className="w-10 h-10 text-accent-blue opacity-50" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">漏洞发现</p>
              <p className="text-2xl font-bold text-accent-red">{stats.vulnerable}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-accent-red opacity-50" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">漏洞率</p>
              <p className="text-2xl font-bold text-accent-yellow">
                {stats.vulnerabilityRate.toFixed(1)}%
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-accent-yellow opacity-50" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">平均响应</p>
              <p className="text-2xl font-bold text-white">{stats.avgTime}ms</p>
            </div>
            <Clock className="w-10 h-10 text-accent-green opacity-50" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card title="攻击类型分布">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="测试趋势">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="vulnerable" fill="#ef4444" name="存在漏洞" />
              <Bar dataKey="safe" fill="#22c55e" name="安全" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="详细测试记录">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">时间</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">模板</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">状态</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">置信度</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">响应时间</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.slice(0, 10).map((result) => (
                <tr key={result.id} className="border-b border-dark-border hover:bg-dark-border/50">
                  <td className="py-3 px-4 text-sm text-gray-300">
                    {new Date(result.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-white">
                    {result.templateName}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={result.isVulnerable ? 'danger' : 'success'}>
                      {result.isVulnerable ? '存在漏洞' : '安全'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-300">
                    {Math.round(result.confidenceScore * 100)}%
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-300">
                    {result.executionTime}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Results;