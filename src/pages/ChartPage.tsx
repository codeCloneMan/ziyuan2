import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Download, X, ZoomIn } from 'lucide-react';

export default function ChartPage() {
  const [fullscreen, setFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setFullscreen(prev => !prev);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-8 sm:py-12">
      <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">字根图</h1>
        <p className="mt-2 sm:mt-3 text-muted-foreground">字源形码 v1.31 字根键位分布图</p>
      </div>

      <div className="flex items-center justify-center gap-2 mb-4 sm:mb-6">
        <a href="./1.31zigentu.png" download="字源1.31字根图.png">
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs sm:text-sm text-muted-foreground hover:bg-accent/10 transition-colors">
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            下载图片
          </button>
        </a>
      </div>

      {/* 字根图展示 - 点击放大 */}
      <div
        className="overflow-auto rounded-2xl border border-border bg-card p-3 sm:p-4 cursor-zoom-in"
        onClick={toggleFullscreen}
      >
        <div className="flex justify-center">
          <img
            src="./1.31zigentu.png"
            alt="字源形码 v1.31 字根图"
            className="w-full transition-all duration-200"
            draggable={false}
          />
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        <ZoomIn className="inline h-3 w-3 mr-1 -mt-0.5" />
        点击图片可全屏查看
      </p>

      {/* 全屏遮罩 */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-zoom-out"
          onClick={toggleFullscreen}
        >
          <button
            className="absolute top-4 right-4 z-[101] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={toggleFullscreen}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src="./1.31zigentu.png"
            alt="字源形码 v1.31 字根图"
            className="max-h-[95vh] max-w-[95vw] object-contain"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 字根图说明 */}
      <div className="mt-6 sm:mt-8 rounded-2xl border border-border bg-card/50 p-4 sm:p-6">
        <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-foreground">字根图规律说明</h2>
        <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">天地人三排：</strong>
            字母键三排键分别代表"天、地、人"。离自己最近的一排键 ZXCVBNM 是"天"类字根（五行加日月）；
            离自己最远的一排键 QWERTYUIOP 是"地"类字根（动物、植物、山、衣、食、住）；
            中间一排键 ASDFGHJKL 是"人"类字根（人体自身相关）。
          </p>
          <p>
            <strong className="text-foreground">数字键位：</strong>
            "一二三四五六七八九十"安排在最上面一排键。
          </p>
          <p>
            <strong className="text-foreground">V 型结构：</strong>
            横折点撇竖，分别对应 Q D V M L 五个键位。
          </p>
          <p>
            <strong className="text-foreground">红字根口诀：</strong>
            鱼犬鸟草竹，衣丝山食户。女人手又足，儿身口言无。金木水火土，日月祭今古。
          </p>
        </div>
      </div>
    </div>
  );
}
