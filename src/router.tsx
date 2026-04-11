import { createHashRouter } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import PracticePage from '@/pages/PracticePage';
import TablePage from '@/pages/TablePage';
import ChartPage from '@/pages/ChartPage';
import Layout from '@/components/Layout';

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'practice', element: <PracticePage /> },
      { path: 'table', element: <TablePage /> },
      { path: 'chart', element: <ChartPage /> },
    ],
  },
]);

export default router;
