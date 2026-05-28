import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { renderableKeyGroups, keyboardRows } from '@/data/roots';
import { getExamplesByRoot } from '@/data/rootExamples';
import { useCharCodeData, type CharCodeItem } from '@/lib/data-loader';
import RootCharDisplay from '@/components/RootCharDisplay';
import { Search, Keyboard, X, BookOpen, LayoutGrid, List, Hash } from 'lucide-react';
import type { RootMapping } from '@/data/roots';

/** 显示模式：紧凑/详细 */
type DisplayMode = 'compact' | 'detailed';

/** 从 charCodeData 中提取包含指定字根的汉字 */
function findCharsContainingRoot(rootChar: string, charCodeData: CharCodeItem[], maxCount: number = 12): { char: string; code: string }[] {
  const results: { char: string; code: string }[] = [];
  const seen = new Set<string>();
  for (const item of charCodeData) {
    if (results.length >= maxCount) break;
    if (!seen.has(item.char)) {
      seen.add(item.char);
      if (item.char.includes(rootChar)) {
        results.push({ char: item.char, code: item.code });
      }
    }
  }
  return results;
}

export default function TablePage() {
  const { data: charCodeData } = useCharCodeData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedRoot, setSelectedRoot] = useState<RootMapping | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('detailed');

  const filteredGroups = useMemo(() => {
    if (selectedKey) {
      return renderableKeyGroups.filter((g) => g.key === selectedKey);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      return renderableKeyGroups
        .map((g) => ({
          ...g,
          roots: g.roots.filter(
            (r) =>
              r.char.includes(query) ||
              r.key === query ||
              r.key.toUpperCase() === query.toUpperCase() ||
              (r.desc && r.desc.includes(query))
          ),
        }))
        .filter((g) => g.roots.length > 0);
    }
    return renderableKeyGroups;
  }, [searchQuery, selectedKey]);

  const totalRoots = renderableKeyGroups.reduce((sum, g) => sum + g.roots.length, 0);

  const renderableRootCountBykey = useMemo(() => {
    const map: Record<string, number> = {};
    renderableKeyGroups.forEach((g) => {
      map[g.key] = g.roots.length;
    });
    return map;
  }, []);

  // 弹窗数据：避免重复调用昂贵函数
  const exampleChars = useMemo(
    () => selectedRoot ? getExamplesByRoot(selectedRoot.char).slice(0, 8) : [],
    [selectedRoot]
  );
  const matchingChars = useMemo(
    () => selectedRoot && charCodeData ? findCharsContainingRoot(selectedRoot.char, charCodeData) : [],
    [selectedRoot, charCodeData]
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Hero区 */}
      <section className="py-6 sm:py-12 lg:py-16 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        <div className="container-page text-center">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium">
            <BookOpen className="h-4 w-4 mr-1.5" />
            v1.32版完整字根表
          </Badge>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 animate-slideInUp">
            字根
            <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent"> 总表</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            共 <span className="font-bold text-foreground text-xl">{totalRoots}</span> 个字根，
            分布在 <span className="font-bold text-primary text-xl">26</span> 个键位上
          </p>

          {/* 快速统计 */}
          <div className="mt-4 sm:mt-8 flex items-center justify-center gap-4 sm:gap-12 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            <div className="text-center">
              <div className="stat-number text-primary">{totalRoots}</div>
              <div className="stat-label">总字根数</div>
            </div>
            <div className="w-px h-8 sm:h-12 bg-border"></div>
            <div className="text-center">
              <div className="stat-number text-accent">26</div>
              <div className="stat-label">键位数</div>
            </div>
            <div className="w-px h-8 sm:h-12 bg-border"></div>
            <div className="text-center">
              <div className="stat-number">{Math.round(totalRoots / 26)}</div>
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
                placeholder="搜索字根、键位或描述..."
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
            <div className="flex flex-col items-center gap-0.5 p-1 sm:p-2 rounded-lg sm:rounded-xl bg-muted/30 border border-border/60 w-full max-w-lg">
              {keyboardRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-0.5 sm:gap-1.5 w-full" style={{ paddingLeft: `${rowIndex * 4}px` }}>
                  {row.map((key) => {
                    const rootCount = renderableRootCountBykey[key] || 0;
                    const isSelected = selectedKey === key;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setSelectedKey(isSelected ? null : key);
                          setSearchQuery('');
                        }}
                        className={cn(
                          'group relative flex flex-1 min-w-0 h-8 sm:h-10 sm:w-10 sm:flex-none flex-col items-center justify-center rounded-md sm:rounded-xl border-2 text-xs font-semibold transition-colors cursor-pointer select-none',
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
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-border/60">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-primary text-sm sm:text-base font-bold text-primary-foreground shadow-sm shrink-0">
                    {group.key.toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-foreground">
                      键位 {group.key.toUpperCase()}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                      包含 {group.roots.length} 个字根
                    </p>
                  </div>

                  <Badge variant="secondary" className="bg-primary/10 text-primary font-semibold text-[11px] sm:text-xs shrink-0">
                    {group.roots.length}
                  </Badge>
                </div>

                {/* 字根列表 */}
                <div className={cn(
                  "flex flex-wrap gap-2",
                  displayMode === 'compact' && "gap-1.5"
                )}>
                  {group.roots.map((root, rootIdx) => (
                    <RootCharDisplay
                      key={`${root.char}-${root.key}-${rootIdx}`}
                      root={root}
                      size={displayMode === 'compact' ? 'sm' : 'md'}
                      showDesc={displayMode === 'detailed'}
                      className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all duration-200"
                      onClick={() => setSelectedRoot(root)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {filteredGroups.length === 0 && (
            <div className="empty-state">
              <Keyboard className="empty-state-icon" />
              <h3 className="empty-state-title">没有找到匹配的字根</h3>
              <p className="empty-state-desc">尝试使用其他关键词或清除筛选条件</p>
            </div>
          )}
        </div>
      </section>

      {/* 字根详情弹窗 */}
      {selectedRoot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setSelectedRoot(null)}
        >
          <div
            className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden animate-slideInUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="relative p-6 pb-4 bg-gradient-to-br from-primary/5 to-accent/5 border-b border-border/40">
              <button
                onClick={() => setSelectedRoot(null)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary transition-colors btn-icon"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-primary text-3xl font-bold text-primary-foreground shadow-lg">
                  {selectedRoot.key.toUpperCase()}
                </div>
                
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                    字根详情
                  </h3>
                  <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">
                    键位 {selectedRoot.key.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 space-y-4">
              {/* 字根展示 */}
              <div className="flex items-center justify-center py-4">
                <div className="flex h-24 w-24 sm:h-32 sm:w-32 items-center justify-center rounded-3xl border-2 border-border bg-card">
                  <RootCharDisplay
                    root={selectedRoot}
                    size="xl"
                    showDesc={false}
                    className="text-4xl sm:text-5xl"
                  />
                </div>
              </div>
              
              {/* 字根描述 */}
              {selectedRoot.desc && (
                <div className="text-center">
                  <Badge variant="secondary" className="bg-secondary text-secondary-foreground text-sm">
                    {selectedRoot.desc}
                  </Badge>
                </div>
              )}

              {/* 例字展示 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  常见例字
                </div>
                <div className="flex flex-wrap gap-2">
                  {exampleChars.length > 0 ? (
                    exampleChars.map((char, idx) => (
                      <div
                        key={idx}
                        className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg border border-border bg-card text-lg sm:text-xl font-medium text-foreground hover:border-primary/50 hover:bg-accent/10 transition-colors cursor-default"
                      >
                        {char}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无例字数据</p>
                  )}
                </div>
              </div>

              {/* 包含该字根的汉字（从码表提取） */}
              {matchingChars.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    码表中的汉字
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {matchingChars.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-card text-sm hover:border-primary/50 hover:bg-accent/10 transition-colors cursor-default"
                      >
                        <span className="root-char text-lg font-medium text-foreground">{item.char}</span>
                        <span className="font-mono text-[10px] text-primary uppercase">{item.code}</span>
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
