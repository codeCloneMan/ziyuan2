import { createHashRouter, type RouteObject } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Layout 保持静态导入（首屏必需）
import Layout from '@/components/Layout';

// ========================================
// 路由级代码分割：所有页面组件懒加载
// ========================================
const HomePage = lazy(() => import('@/pages/HomePage'));
const PracticePage = lazy(() => import('@/pages/PracticePage'));
const WholeCharPracticePage = lazy(() => import('@/pages/WholeCharPracticePage'));
const PhrasePracticePage = lazy(() => import('@/pages/PhrasePracticePage'));
const TablePage = lazy(() => import('@/pages/TablePage'));
const ChartPage = lazy(() => import('@/pages/ChartPage'));
const FAQPage = lazy(() => import('@/pages/FAQPage'));
const EvaluatePage = lazy(() => import('@/pages/EvaluatePage'));
const SplitSearchPage = lazy(() => import('@/pages/SplitSearchPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

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
