import { createHashRouter, useRouteError, type RouteObject } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Layout 保持静态导入（首屏必需）
import Layout from '@/components/Layout';

/** 各家浏览器动态 import 失败的报错文案（Chrome/Firefox/Safari/webpack） */
const CHUNK_ERROR_RE = /failed to fetch dynamically imported module|importing a module script|error loading dynamically imported module|chunkloaderror/i;

/** 路由加载骨架屏 */
function PageSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">加载中...</span>
      </div>
    </div>
  );
}

/** 包裹 Suspense 的懒加载路由元素 */
function lazyElement(Component: React.LazyExoticComponent<React.ComponentType>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Component />
    </Suspense>
  );
}

/**
 * 部署更新自愈（v2）：清空本地所有缓存并注销全部 Service Worker，然后整页刷新。
 *
 * 单纯 location.reload() 不够：发新版后的过渡期里，旧版 SW（缓存优先策略）
 * 仍可能控制页面，刷新拿到的还是旧 index.html，旧壳继续引用已 404 的旧 hash
 * 分块，自愈就失效了。清掉 Cache Storage 与 SW 后刷新，必定从网络拿到新壳。
 *
 * 先用带随机参数的请求探测网络：离线时刷新只会得到浏览器离线错误页，
 * 此时不清缓存（保住离线兜底能力），把错误抛给 RouteErrorElement 处理。
 */
async function recoverFromStaleDeploy(): Promise<void> {
  await fetch(`/?__stale-check=${Date.now()}`, { cache: 'no-store' });
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
  }
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(reg => reg.unregister()));
  }
  window.location.reload();
}

/** 路由级错误兜底页（替代 React Router 默认的英文开发者报错页） */
function RouteErrorElement() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : String(error ?? '');
  const isChunkError = CHUNK_ERROR_RE.test(message);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="card-base w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-2xl">
          🔄
        </div>
        <h1 className="mb-2 text-xl font-bold text-foreground">页面加载失败</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          {isChunkError
            ? '网站刚发布了新版本，本地缓存的旧页面已失效，点击刷新即可恢复。'
            : '页面出错了，请刷新重试。'}
        </p>
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => {
            try { sessionStorage.removeItem('ziyuan-chunk-reload'); } catch { /* 隐私模式下忽略 */ }
            window.location.reload();
          }}
        >
          刷新页面
        </button>
        <p className="mt-4 text-xs text-muted-foreground/70">
          若反复出现，请检查网络或清除浏览器缓存
        </p>
      </div>
    </div>
  );
}

/**
 * 懒加载页面 + 部署更新自愈。
 * 发新版后，用户手里旧页面引用的 chunk hash 已失效，动态 import 会失败
 * （"Failed to fetch dynamically imported module"）。检测到此类失败时执行
 * recoverFromStaleDeploy（清缓存+注销 SW+刷新）；离线时自愈无法进行，
 * 抛给 errorElement 展示友好错误页。
 * sessionStorage 标记保证每个会话最多自愈一次，防止刷新循环。
 */
function lazyPage(loader: () => Promise<{ default: React.ComponentType }>) {
  return lazy(() =>
    loader()
      .then(mod => {
        sessionStorage.removeItem('ziyuan-chunk-reload');
        return mod;
      })
      .catch(async (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (CHUNK_ERROR_RE.test(msg) && !sessionStorage.getItem('ziyuan-chunk-reload')) {
          sessionStorage.setItem('ziyuan-chunk-reload', '1');
          try {
            await recoverFromStaleDeploy();
          } catch {
            // 离线等场景：放弃自愈，落到 errorElement 的友好错误页
          }
        }
        throw err;
      }),
  );
}

const HomePage = lazyPage(() => import('@/pages/HomePage'));
const PracticePage = lazyPage(() => import('@/pages/PracticePage'));
const WholeCharPracticePage = lazyPage(() => import('@/pages/WholeCharPracticePage'));
const PhrasePracticePage = lazyPage(() => import('@/pages/PhrasePracticePage'));
const TablePage = lazyPage(() => import('@/pages/TablePage'));
const ChartPage = lazyPage(() => import('@/pages/ChartPage'));
const FAQPage = lazyPage(() => import('@/pages/FAQPage'));
const EvaluatePage = lazyPage(() => import('@/pages/EvaluatePage'));
const SplitSearchPage = lazyPage(() => import('@/pages/SplitSearchPage'));
const NotFoundPage = lazyPage(() => import('@/pages/NotFoundPage'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteErrorElement />,
    children: [
      { index: true, element: lazyElement(HomePage) },
      { path: 'practice', element: lazyElement(PracticePage) },
      { path: 'whole-char', element: lazyElement(WholeCharPracticePage) },
      { path: 'phrase', element: lazyElement(PhrasePracticePage) },
      { path: 'table', element: lazyElement(TablePage) },
      { path: 'chart', element: lazyElement(ChartPage) },
      { path: 'faq', element: lazyElement(FAQPage) },
      { path: 'evaluate', element: lazyElement(EvaluatePage) },
      { path: 'split-search', element: lazyElement(SplitSearchPage) },
      { path: '*', element: lazyElement(NotFoundPage) },
    ],
  },
];

const router = createHashRouter(routes);

export default router;
