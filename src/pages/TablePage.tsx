import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { renderableKeyGroups, keyboardRows } from '@/data/roots';
import { getExamplesByRoot } from '@/data/rootExamples';
import RootCharDisplay from '@/components/RootCharDisplay';
import { Search, Keyboard, X, BookOpen } from 'lucide-react';
import type { RootMapping } from '@/data/roots';

export default function TablePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedRoot, setSelectedRoot] = useState<RootMapping | null>(null);

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

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-8 sm:py-12">
      {/* 标题 */}
      <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">字根总表</h1>
        <p className="mt-2 sm:mt-3 text-muted-foreground">
          共 <span className="font-semibold text-foreground">{totalRoots}</span> 个字根，
          分布在 <span className="font-semibold text-foreground">26</span> 个键位上
        </p>
      </div>

      {/* 搜索栏 */}
      <div className="mx-auto mb-6 sm:mb-8 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索字根、键位或描述..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedKey(null);
            }}
            className="border-border pl-10 focus:border-primary"
          />
        </div>
      </div>

      {/* 虚拟键盘选择器 */}
      <div className="mb-8 sm:mb-10 flex flex-col items-center gap-1.5 sm:gap-2">
        {keyboardRows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1 sm:gap-1.5" style={{ paddingLeft: `${rowIndex * 10}px` }}>
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
                  className={`flex h-8 w-8 sm:h-10 sm:w-10 flex-col items-center justify-center rounded-md sm:rounded-lg border-2 text-xs font-semibold transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:border-primary/30 hover:bg-accent/10'
                  }`}
                >
                  <span className="text-[10px] sm:text-sm font-bold">{key.toUpperCase()}</span>
                  <span className={`text-[8px] sm:text-[10px] ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {rootCount}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* 字根分组展示 */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredGroups.map((group) => (
          <Card
            key={group.key}
            className="border-border bg-card/80 transition-all hover:border-primary/20 hover:shadow-md"
          >
            <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
              <CardTitle className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base">
                <span className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-primary text-sm sm:text-lg font-bold text-primary-foreground">
                  {group.key.toUpperCase()}
                </span>
                <span className="text-foreground">
                  键位 {group.key.toUpperCase()}
                </span>
                <Badge variant="secondary" className="ml-auto bg-secondary text-secondary-foreground text-xs">
                  {group.roots.length} 个字根
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {group.roots.map((root, idx) => (
                  <RootCharDisplay
                    key={`${root.char}-${root.key}-${idx}`}
                    root={root}
                    size="sm"
                    showDesc={true}
                    className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                    onClick={() => setSelectedRoot(root)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <div className="py-12 sm:py-16 text-center text-muted-foreground">
          <Keyboard className="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12" />
          <p>没有找到匹配的字根</p>
        </div>
      )}

      {/* 字根详情弹窗 */}
      {selectedRoot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedRoot(null)}
        >
          <Card
            className="w-full max-w-md border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="relative pb-3">
              <button
                onClick={() => setSelectedRoot(null)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-primary text-2xl sm:text-3xl font-bold text-primary-foreground">
                  {selectedRoot.key.toUpperCase()}
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl text-foreground mb-1">
                    字根详情
                  </CardTitle>
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    键位 {selectedRoot.key.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  {getExamplesByRoot(selectedRoot.char).length > 0 ? (
                    getExamplesByRoot(selectedRoot.char).slice(0, 8).map((char, idx) => (
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
