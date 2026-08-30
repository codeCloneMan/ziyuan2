/* ========================================
   字源形码 - Service Worker
   策略：
   - 页面导航 network-first（保证发版后拿到新壳），离线兜底缓存
   - 静态资源（构建产物带 hash）缓存优先，网络回退
   - 数据 JSON（3.6MB 码表）stale-while-revalidate，
     刷新时静默更新缓存，离线时直接用缓存
   - 仅同源 GET 请求，跳过跨域字体（由浏览器处理）
   ======================================== */
const CACHE_VERSION = 'v2';
const SHELL_CACHE = `ziyuan-shell-${CACHE_VERSION}`;
const DATA_CACHE = 'ziyuan-data-v1'; // 与 data-loader.ts 保持一致

const SHELL_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './pwa-icon.svg',
];

/** 判断是否为数据 JSON */
function isDataRequest(url) {
  return url.pathname.includes('/data/');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('ziyuan-shell-') && key !== SHELL_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 仅处理同源 GET 请求
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // ============ 数据 JSON：stale-while-revalidate ============
  if (isDataRequest(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        // 后台刷新网络数据并更新缓存（失败静默，不影响当前响应）
        const networkFetch = fetch(request)
          .then((resp) => {
            if (resp && resp.ok) {
              const clone = resp.clone();
              caches.open(DATA_CACHE).then((cache) => cache.put(request, clone));
            }
            return resp;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })
    );
    return;
  }

  // ============ 页面导航：网络优先，缓存兜底 ============
  // 必须 network-first：发新版后旧 index.html 引用的 hash 资源已不存在，
  // 缓存优先会让老用户永远停留在旧应用壳。
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp && resp.ok) {
            const clone = resp.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // ============ 静态资源（带 hash）：缓存优先，网络回退 ============
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((resp) => {
        // 只缓存同源成功的响应（构建产物 hash 不变，可长期缓存）
        if (resp && resp.ok && request.url.startsWith(self.location.origin)) {
          const clone = resp.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
        }
        return resp;
      });
    })
  );
});
