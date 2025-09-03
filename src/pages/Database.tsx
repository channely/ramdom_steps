import React, { useState } from 'react';
import { Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { dbService } from '../lib/db';

const Database: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await dbService.exportData();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-security-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('导出失败');
    }
    setIsExporting(false);
  };

  const handleImport = async () => {
    if (!importFile) {
      alert('请选择要导入的文件');
      return;
    }

    setIsImporting(true);
    try {
      const text = await importFile.text();
      const data = JSON.parse(text);
      await dbService.importData(data);
      alert('数据导入成功');
      setImportFile(null);
    } catch (error) {
      alert('导入失败：文件格式错误');
    }
    setIsImporting(false);
  };

  const handleClearAll = async () => {
    if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
      if (confirm('再次确认：是否真的要删除所有数据？')) {
        await dbService.clearAllData();
        alert('所有数据已清除');
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">数据管理</h1>
        <p className="text-gray-400">备份、恢复和管理应用数据</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="数据导出"
          description="将所有数据导出为JSON文件"
        >
          <div className="space-y-4">
            <div className="p-4 bg-dark-bg rounded-lg">
              <p className="text-sm text-gray-300 mb-2">导出内容包括：</p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• 所有测试模板</li>
                <li>• 测试结果记录</li>
                <li>• 测试会话历史</li>
                <li>• API配置信息</li>
              </ul>
            </div>
            <Button onClick={handleExport} loading={isExporting} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              导出数据
            </Button>
          </div>
        </Card>

        <Card
          title="数据导入"
          description="从备份文件恢复数据"
        >
          <div className="space-y-4">
            <div className="p-4 bg-dark-bg rounded-lg">
              {importFile ? (
                <div>
                  <p className="text-sm text-gray-300 mb-2">已选择文件：</p>
                  <p className="text-white font-mono text-sm">{importFile.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    大小：{(importFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">请选择要导入的JSON文件</p>
              )}
            </div>
            
            <label className="block">
              <div className="w-full px-4 py-2 text-base rounded-lg font-medium bg-dark-border hover:bg-dark-border/80 text-white transition-colors flex items-center justify-center space-x-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>选择文件</span>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            <Button 
              onClick={handleImport} 
              loading={isImporting} 
              disabled={!importFile}
              className="w-full"
            >
              导入数据
            </Button>
          </div>
        </Card>

        <Card
          title="危险操作"
          description="请谨慎使用以下功能"
          className="lg:col-span-2"
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-900/20 border border-red-600/50 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium mb-1">警告</p>
                  <p className="text-sm text-red-300">
                    清除所有数据将永久删除所有测试模板、结果和配置。此操作不可恢复！
                  </p>
                </div>
              </div>
            </div>

            <Button variant="danger" onClick={handleClearAll}>
              <Trash2 className="w-4 h-4 mr-2" />
              清除所有数据
            </Button>
          </div>
        </Card>

        <Card
          title="存储信息"
          description="浏览器本地存储使用情况"
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-dark-bg rounded-lg">
              <p className="text-sm text-gray-400 mb-1">存储类型</p>
              <p className="text-white font-medium">IndexedDB</p>
              <p className="text-xs text-gray-500 mt-1">持久化本地存储</p>
            </div>
            <div className="p-4 bg-dark-bg rounded-lg">
              <p className="text-sm text-gray-400 mb-1">数据位置</p>
              <p className="text-white font-medium">浏览器本地</p>
              <p className="text-xs text-gray-500 mt-1">数据不会上传到服务器</p>
            </div>
            <div className="p-4 bg-dark-bg rounded-lg">
              <p className="text-sm text-gray-400 mb-1">安全性</p>
              <p className="text-white font-medium">仅本地访问</p>
              <p className="text-xs text-gray-500 mt-1">数据仅在当前浏览器可用</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-dark-bg rounded-lg">
            <p className="text-sm text-gray-300 mb-2">注意事项：</p>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• 清除浏览器数据可能会删除存储的内容</li>
              <li>• 建议定期导出重要数据进行备份</li>
              <li>• 不同浏览器或设备间的数据不会同步</li>
              <li>• 隐私模式下数据可能无法持久保存</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Database;