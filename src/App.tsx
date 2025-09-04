import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Templates from './pages/Templates';
import Execute from './pages/Execute';
import Results from './pages/Results';
import Database from './pages/Database';
import Settings from './pages/Settings';
import Variables from './pages/Variables';
import { checkAndInitializeEnhancedData } from './utils/initializeEnhancedData';

function App() {
  useEffect(() => {
    // 只进行必要的数据初始化，不执行任何自动修复或检查
    // 所有数据操作由用户主动控制
    checkAndInitializeEnhancedData();
  }, []);
  return (
    <Router basename="/ramdom_steps">
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/execute" element={<Execute />} />
          <Route path="/results" element={<Results />} />
          <Route path="/database" element={<Database />} />
          <Route path="/variables" element={<Variables />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App
