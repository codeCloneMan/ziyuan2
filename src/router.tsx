import { createHashRouter, type RouteObject } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Layout 保持静态导入（首屏必需）
import Layout from '@/components/Layout';

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
 * 懒加载页面 + 部署更新自愈。
 * 发新版后，用户手里旧页面引用的 chunk hash 已失效，动态 import 会失败
 * （"Failed to fetch dynamically imported module"）。检测到此类失败时
 * 整页刷新一次：刷新后拿到新 index.html 与新资源，导航即恢复。
 * sessionStorage 标记防止「新页面仍失败」时无限刷新循环。
 */
function lazyPage(loader: () => Promise<{ default: React.ComponentType }>) {
  return lazy(() =>
    loader()
      .then(mod => {
        sessionStorage.removeItem('ziyuan-chunk-reload');
        return mod;
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        const isChunkError =
          /failed to fetch dynamically imported module|importing a module script|error loading dynamically imported module|chunkloaderror/i.test(msg);
        if (isChunkError && !sessionStorage.getItem('ziyuan-chunk-reload')) {
          sessionStorage.setItem('ziyuan-chunk-reload', '1');
          window.location.reload();
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
