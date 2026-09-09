// 官方字根图全量预加载。
//
// 练习每道题显示一张 roots/*.png（约 300~800 字节，390 张共约 200KB）。
// 若不预加载，每张图首次显示时才发请求，切题时会出现可感知的空白。
// 这里在页面加载完成后一次性预热全部图片：请求经过 Service Worker 的
// 缓存优先策略（public/sw.js），预热后所有题目即秒出、离线也可练。
// 总量只有约 200KB，无需分批限速；当前正在显示的题图由浏览器自然优先。
//
// 每次页面会话只跑一次。
import { ROOT_IMAGE_POOL } from '@/data/root-images';

let started = false;

export function preloadRootImages(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  const kickOff = () => {
    for (const img of ROOT_IMAGE_POOL) {
      const im = new Image();
      im.decoding = 'async';
      im.src = `${import.meta.env.BASE_URL}roots/${img.file}`;
    }
  };

  // 等首次绘制完成再开始，避免与应用关键资源抢带宽
  if (document.readyState === 'complete') kickOff();
  else window.addEventListener('load', kickOff, { once: true });
}
