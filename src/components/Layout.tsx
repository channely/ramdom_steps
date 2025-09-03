import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, FileText, Play, BarChart3, Settings, Database, AlertTriangle, Variable } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Shield, label: '安全测试' },
    { path: '/templates', icon: FileText, label: '模板管理' },
    { path: '/variables', icon: Variable, label: '变量管理' },
    { path: '/execute', icon: Play, label: '批量测试' },
    { path: '/results', icon: BarChart3, label: '结果分析' },
    { path: '/database', icon: Database, label: '数据管理' },
    { path: '/settings', icon: Settings, label: '系统设置' },
  ];

  return (
    <div className="flex h-screen bg-dark-bg">
      <aside className="w-64 bg-dark-surface border-r border-dark-border">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <AlertTriangle className="w-8 h-8 text-accent-red" />
            <div>
              <h1 className="text-xl font-bold text-white">Prompt Security</h1>
              <p className="text-xs text-gray-400">越狱测试工具 v1.0</p>
            </div>
          </div>
          
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-accent-red/20 text-accent-red border-l-2 border-accent-red'
                      : 'text-gray-300 hover:bg-dark-border hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

      </aside>

      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-thin">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;