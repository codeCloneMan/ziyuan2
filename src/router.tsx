import { createHashRouter } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import PracticePage from '@/pages/PracticePage';
import WholeCharPracticePage from '@/pages/WholeCharPracticePage';
import TablePage from '@/pages/TablePage';
import ChartPage from '@/pages/ChartPage';
import FAQPage from '@/pages/FAQPage';
import Layout from '@/components/Layout';

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'practice', element: <PracticePage /> },
      { path: 'whole-char', element: <WholeCharPracticePage /> },
      { path: 'table', element: <TablePage /> },
      { path: 'chart', element: <ChartPage /> },
      { path: 'faq', element: <FAQPage /> },
    ],
  },
]);

export default router;
