import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, X, ZoomIn, Image as ImageIcon } from 'lucide-react';

export default function ChartPage() {
  const [fullscreen, setFullscreen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setFullscreen(prev => !prev);
  }, []);

  // ESC 键退出全屏 + 锁定背景滚动
  useEffect(() => {
    if (!fullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [fullscreen]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero区 */}
      <section className="py-8 sm:py-16 lg:py-20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        <div className="container-page text-center max-w-4xl">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium">
            <ImageIcon className="h-4 w-4 mr-1.5" />
            v1.32版完整字根图
          </Badge>
          
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold tracking-tight mb-4 animate-slideInUp">
            字根
            <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent"> 图</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            字源形码 v1.32 字根键位分布图
          </p>

          {/* 快速操作 - 与 icon 放一行 */}
          <div className="mt-8 flex items-center justify-center gap-3 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            <a href="./字源字根图.png" download="字源1.32字根图.png">
              <Button className="gap-2">
                <Download className="h-4 w-4" />
                下载高清图片
              </Button>
            </a>
            <Button
              variant="outline"
              onClick={toggleFullscreen}
              className="gap-2"
            >
              <ZoomIn className="h-4 w-4" />
              全屏查看
            </Button>
          </div>
        </div>
      </section>

      {/* 字根图展示区 */}
      <section className="pb-12 sm:pb-16">
        <div className="container-page max-w-6xl">
          {/* 图片容器 */}
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
              "hover:shadow-xl transition-all duration-300 group cursor-zoom-in"
            )}
            onClick={toggleFullscreen}
          >
            {/* 悬浮提示 */}
            <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-md">
                <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">点击放大</span>
              </div>
            </div>

            {/* 图片内容 */}
            <div className="overflow-auto p-6 sm:p-8">
              <div className="flex justify-center">
                {imgError ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-sm">字根图加载失败</p>
                  </div>
                ) : (
                  <img
                    src="./字源字根图.png"
                    alt="字源形码 v1.32 字根图"
                    className="w-full max-w-5xl transition-transform duration-300 group-hover:scale-[1.02]"
                    draggable={false}
                    onError={() => setImgError(true)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 底部提示 */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <ZoomIn className="h-4 w-4" />
            <span>点击图片可全屏查看 · 支持滚轮缩放</span>
          </div>
        </div>
      </section>

      {/* 字根图说明 */}
      <section className="pb-16 sm:pb-20 bg-muted/30">
        <div className="container-page max-w-4xl">
          <div className="card-stats">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <ImageIcon className="h-6 w-6 text-primary" />
                字根图规律说明
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                掌握这些规律，快速记忆所有字根位置
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {/* 天地人三排 */}
              <div className="card-base">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <span className="text-lg">🌍</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-2">天地人三排</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      字母键三排键分别代表<span className="font-semibold text-foreground">"天、地、人"</span>。
                      离自己最近的一排键 ZXCVBNM 是"天"类字根（五行加日月）；
                      离自己最远的一排键 QWERTYUIOP 是"地"类字根（动物、植物、山、衣、食、住）；
                      中间一排键 ASDFGHJKL 是"人"类字根（人体自身相关）。
                    </p>
                  </div>
                </div>
              </div>

              {/* 数字键位 */}
              <div className="card-base">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <span className="text-lg">#️⃣</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-2">数字键位</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">"一二三四五六七八九十"</span>
                      安排在最上面一排键，方便记忆和使用。
                    </p>
                  </div>
                </div>
              </div>

              {/* V型结构 */}
              <div className="card-base">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <span className="text-lg">✏️</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-2">V 型结构</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">横折点撇竖</span>
                      ，分别对应 Q D V M L 五个键位，形成V型分布结构。
                    </p>
                  </div>
                </div>
              </div>

              {/* 口诀 */}
              <div className="card-base bg-gradient-to-br from-primary/5 to-accent/5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <span className="text-lg">📜</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-2">红字根口诀</h3>
                    <p className="text-sm font-medium text-foreground leading-relaxed tracking-wide">
                      鱼犬鸟草竹，衣丝山食户。<br />
                      女人手又足，儿身口言无。<br />
                      金木水火土，日月祭今古。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 全屏遮罩 */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md cursor-zoom-out animate-fadeIn"
          onClick={toggleFullscreen}
        >
          {/* 关闭按钮 */}
          <button
            className="absolute top-6 right-6 z-[101] flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all duration-200 btn-icon"
            onClick={toggleFullscreen}
          >
            <X className="h-7 w-7" />
          </button>

          {/* 提示文字 */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-sm flex items-center gap-2 pointer-events-none">
            <ZoomIn className="h-4 w-4" />
            按 Esc 键或点击黑色区域退出全屏
          </div>

          {/* 全屏图片 */}
          <img
            src="./字源字根图.png"
            alt="字源形码 v1.32 字根图"
            className="max-h-[92vh] max-w-[92vw] object-contain rounded-lg shadow-2xl animate-slideInUp"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}