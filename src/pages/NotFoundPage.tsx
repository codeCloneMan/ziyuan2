import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** 404 页面：访问不存在的路由时显示 */
export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      {/* Terminal-style card */}
      <div className="w-full max-w-md rounded-lg border border-border bg-card overflow-hidden">
        {/* Terminal title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/40">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <span className="h-3 w-3 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs text-muted-foreground font-mono ml-2">error -- page not found</span>
        </div>

        {/* Content */}
        <div className="px-6 py-10">
          <div className="font-mono text-7xl font-bold text-primary tracking-tighter mb-4">
            404
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-3">页面不存在</h2>
          <div className="font-mono text-sm text-muted-foreground mb-8 bg-muted/50 rounded-lg px-4 py-3 inline-block">
            <span className="text-primary">$</span> 你访问的页面不存在或已被移除，请检查地址是否正确。
          </div>
          <div>
            <Link to="/">
              <Button className="gap-2 rounded-lg">
                <Home className="h-4 w-4" />
                返回首页
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
