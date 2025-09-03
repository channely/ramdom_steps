import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Templates from './pages/Templates';
import Execute from './pages/Execute';
import Results from './pages/Results';
import Database from './pages/Database';
import Settings from './pages/Settings';
import Variables from './pages/Variables';

function App() {
  return (
    <Router>
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
