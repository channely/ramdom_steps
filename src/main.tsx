import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeApp } from './utils/initializeApp'
import './utils/debugHelpers' // 导入调试辅助函数

// 初始化应用
initializeApp().then(() => {
  console.log('应用初始化完成');
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
