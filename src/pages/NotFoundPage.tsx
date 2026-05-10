import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** 404 页面：访问不存在的路由时显示 */
export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <AlertCircle className="h-16 w-16 text-muted-foreground mb-6" />
      <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
      <h2 className="text-xl font-semibold text-foreground mb-4">页面不存在</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        你访问的页面不存在或已被移除，请检查地址是否正确。
      </p>
      <Link to="/">
        <Button className="gap-2">
          <Home className="h-4 w-4" />
          返回首页
        </Button>
      </Link>
    </div>
  );
}
