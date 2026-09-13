import { useEffect, useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { keyboardRows, ROOT_IMAGE_MANIFEST, rootMappings } from '@/data/roots';
import { imagesByKey, rootImagePath, ROOT_IMAGE_POOL, type RootImage } from '@/data/root-images';
import { getExamplesByRoot } from '@/data/rootExamples';
import { Search, Keyboard, X, BookOpen, LayoutGrid, List } from 'lucide-react';

/** 显示模式：紧凑/详细 */
type DisplayMode = 'compact' | 'detailed';

/**
 * 图文件 → 已核验的字根身份描述（如 "走变"）。
 * 官方图集里只有部分变体字根做过图↔码点的人工核验（ROOT_IMAGE_MANIFEST），
 * 其余图不标身份——宁缺毋错：没有身份的图只展示图与键位，不猜描述。
 */
const descsByFile: Map<string, string[]> = (() => {
  const map = new Map<string, string[]>();
  for (const [cpHex, file] of Object.entries(ROOT_IMAGE_MANIFEST)) {
    const root = rootMappings.find(r => r.codePoint === Number(cpHex));
    if (!root?.desc) continue;
    const arr = map.get(file) ?? [];
    if (!arr.includes(root.desc)) arr.push(root.desc);
    map.set(file, arr);
  }
  return map;
})();

export default function TablePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<RootImage | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('detailed');

  // Esc 关闭详情弹窗
  useEffect(() => {
    if (!selectedImage) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedImage(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedImage]);

  const totalImages = ROOT_IMAGE_POOL.length;

  /** 键位分组（数据源 = 官方字根图集，与字根练习完全同源） */
  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return keyboardRows
      .flat()
      .map(key => {
        let images = imagesByKey[key] ?? [];
        if (selectedKey) {
          if (key !== selectedKey) images = [];
        } else if (query) {
          if (/^[a-z]$/.test(query)) {
            // 单个字母：按键位筛选
            images = key === query ? images : [];
          } else {
            // 其它文本：只匹配已核验的变体身份描述（如 "走变"）
            images = images.filter(img =>
              (descsByFile.get(img.file) ?? []).some(desc => desc.toLowerCase().includes(query))
            );
          }
        }
        return { key, images };
      })
      .filter(g => g.images.length > 0);
  }, [searchQuery, selectedKey]);

  // 弹窗数据：已核验身份描述 + 该字根家族的例字
  const selectedDescs = selectedImage ? descsByFile.get(selectedImage.file) ?? [] : [];
  const exampleBase = selectedDescs[0] ? [...selectedDescs[0]][0] : '';
  const exampleChars = exampleBase ? getExamplesByRoot(exampleBase).slice(0, 8) : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero区 */}
      <section className="py-8 sm:py-14 lg:py-18 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent">
        <div className="container-page text-center">
          <Badge variant="secondary" className="mb-3 px-3 py-1 text-xs font-medium bg-primary/8 text-primary">
            <BookOpen className="h-3.5 w-3.5 mr-1" />
            官方 1.32 字根图集
          </Badge>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-3 animate-slide-in-up" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            字根总表
          </h1>

          <p className="text-sm text-muted-foreground/70 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s', fontFamily: "'Noto Serif SC', serif" }}>
            共 <span className="font-mono-stat font-bold text-foreground">{totalImages}</span> 张官方字根图（与字根练习完全同源），
            分布在 <span className="font-mono-stat font-bold text-primary">26</span> 个键位上
          </p>

          {/* 快速统计 */}
          <div className="mt-6 sm:mt-10 flex items-center justify-center gap-4 sm:gap-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="text-center">
              <div className="stat-number font-mono-stat text-primary">{totalImages}</div>
              <div className="stat-label">字根图</div>
            </div>
            <div className="w-px h-8 sm:h-12 bg-border/50"></div>
            <div className="text-center">
              <div className="stat-number font-mono-stat text-accent">26</div>
              <div className="stat-label">键位数</div>
            </div>
            <div className="w-px h-8 sm:h-12 bg-border/50"></div>
            <div className="text-center">
              <div className="stat-number font-mono-stat">{Math.round(totalImages / 26)}</div>
              <div className="stat-label">平均每键</div>
            </div>
          </div>
        </div>
      </section>

      {/* 搜索与筛选区 */}
      <section className="z-40 bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-2 sm:py-4">
          {/* 搜索栏 + 工具栏 同行 */}
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="input-search flex-1">
              <Search className="icon" />
              <input
                type="text"
                placeholder="搜索键位字母（如 d）或变体字根（如 走变）..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedKey(null);
                }}
                className="w-full"
              />
            </div>
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-1 shrink-0">
              <button
                onClick={() => setDisplayMode('compact')}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all',
                  displayMode === 'compact'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">紧凑</span>
              </button>
              <button
                onClick={() => setDisplayMode('detailed')}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all',
                  displayMode === 'detailed'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">详细</span>
              </button>
            </div>
          </div>

          {/* 虚拟键盘选择器 */}
          <div className="flex justify-center">
            <div className="flex flex-col items-center gap-0.5 p-1 sm:p-2 rounded-lg sm:rounded-lg bg-muted/30 border border-border w-full max-w-lg">
              {keyboardRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-0.5 sm:gap-1.5 w-full" style={{ paddingLeft: `${rowIndex * 4}px` }}>
                  {row.map((key) => {
                    const rootCount = imagesByKey[key]?.length ?? 0;
                    const isSelected = selectedKey === key;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setSelectedKey(isSelected ? null : key);
                          setSearchQuery('');
                        }}
                        className={cn(
                          'group relative flex flex-1 min-w-0 h-8 sm:h-10 sm:w-10 sm:flex-none flex-col items-center justify-center rounded-md sm:rounded-lg border-2 text-xs font-semibold transition-colors cursor-pointer select-none',
                          isSelected
                            ? 'border-primary bg-primary shadow-md sm:scale-105'
                            : 'border-border bg-card hover:border-primary/40 hover:bg-card/80 hover:shadow-sm'
                        )}
                      >
                        <span className={cn(
                          'text-xs sm:text-sm font-bold',
                          isSelected ? 'text-primary-foreground' : 'text-foreground group-hover:text-primary'
                        )}>
                          {key.toUpperCase()}
                        </span>
                        <span className={cn(
                          'text-[8px] sm:text-[10px]',
                          isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        )}>
                          {rootCount}
                        </span>

                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 字根分组展示 */}
      <section className="py-6 sm:py-12 lg:py-16">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className={cn(
            "grid gap-3 sm:gap-4 lg:gap-6",
            displayMode === 'compact'
              ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          )}>
            {filteredGroups.map((group, idx) => (
              <div
                key={group.key}
                className="card-base hover:border-primary/30 stagger-item"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* 卡片头部 */}
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-border">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-lg bg-primary text-sm sm:text-base font-bold text-primary-foreground shadow-sm shrink-0">
                    {group.key.toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-foreground">
                      键位 {group.key.toUpperCase()}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                      包含 {group.images.length} 个字根
                    </p>
                  </div>

                  <Badge variant="secondary" className="bg-primary/10 text-primary font-semibold text-[11px] sm:text-xs shrink-0">
                    {group.images.length}
                  </Badge>
                </div>

                {/* 字根图列表（官方裁剪图，与字根练习同源） */}
                <div className={cn(
                  "grid",
                  displayMode === 'compact'
                    ? "grid-cols-4 sm:grid-cols-5 gap-1.5"
                    : "grid-cols-6 sm:grid-cols-8 gap-2"
                )}>
                  {group.images.map((img) => (
                    <button
                      key={img.file}
                      onClick={() => setSelectedImage(img)}
                      title="查看字根详情"
                      className="group flex items-center justify-center aspect-square rounded-lg border border-border/70 bg-white dark:bg-white/95 shadow-xs hover:border-primary/40 hover:ring-2 hover:ring-primary/40 transition-all duration-150 cursor-pointer overflow-hidden select-none"
                    >
                      <img
                        src={rootImagePath(img.file)}
                        alt="字根图"
                        loading="lazy"
                        draggable={false}
                        className={cn(
                          'object-contain transition-transform duration-150 group-hover:scale-105',
                          displayMode === 'compact' ? 'h-[80%] w-[80%]' : 'h-[85%] w-[85%]'
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {filteredGroups.length === 0 && (
            <div className="empty-state">
              <Keyboard className="empty-state-icon" />
              <h3 className="empty-state-title">没有找到匹配的字根</h3>
              <p className="empty-state-desc">试试单个键位字母（如 d），或清除筛选条件</p>
            </div>
          )}
        </div>
      </section>

      {/* 字根详情弹窗 */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="w-full max-w-md bg-card rounded-lg shadow-2xl border border-border/50 overflow-hidden animate-slide-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="relative p-6 pb-4 bg-primary/5 border-b border-border/40">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary transition-colors btn-icon"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-lg bg-primary text-3xl font-bold text-primary-foreground shadow-lg">
                  {selectedImage.key.toUpperCase()}
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                    字根详情
                  </h3>
                  <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">
                    键位 {selectedImage.key.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 space-y-4">
              {/* 字根官方图 */}
              <div className="flex items-center justify-center py-4">
                <div className="flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-xl border border-border/60 bg-white dark:bg-white/95 shadow-sm overflow-hidden">
                  <img
                    src={rootImagePath(selectedImage.file)}
                    alt="字根图"
                    draggable={false}
                    className="h-[88%] w-[88%] object-contain select-none"
                  />
                </div>
              </div>

              {/* 已核验的字根身份描述（如 "走变"） */}
              {selectedDescs.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {selectedDescs.map((desc) => (
                    <Badge key={desc} variant="secondary" className="bg-secondary text-secondary-foreground text-sm">
                      {desc}
                    </Badge>
                  ))}
                </div>
              )}

              {/* 例字展示（仅已核验身份的字根图有） */}
              {exampleChars.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    常见例字
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {exampleChars.map((char, idx) => (
                      <div
                        key={idx}
                        className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg border border-border bg-card text-lg sm:text-xl font-medium text-foreground hover:border-primary/50 hover:bg-accent/10 transition-colors cursor-default"
                      >
                        {char}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
