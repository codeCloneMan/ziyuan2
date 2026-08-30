import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import router from './router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

// ========================================
// Service Worker 注册（PWA：离线可用、可安装）
// 仅在生产环境注册，避免开发模式热更新干扰
// ========================================
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* 注册失败（如隐私模式）静默忽略，不影响使用 */
    });
  });
}
