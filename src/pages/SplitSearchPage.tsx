import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { charCodeData } from '@/data/charCodeData';
import { rootMappings, findKeyByRoot } from '@/data/roots';
import { Search, SplitSquareHorizontal, X, Keyboard, BookOpen, Hash } from 'lucide-react';

/** 根据编码字母查找对应字根 */
function findRootsByCode(code: string): { key: string; roots: string[] }[] {
  const result: { key: string; roots: string[] }[] = [];
  for (const letter of code.toLowerCase()) {
    const rootsForLetter = rootMappings
      .filter(r => r.key === letter && !r.isPUA)
      .map(r => r.char);
    result.push({ key: letter, roots: rootsForLetter });
  }
  return result;
}

interface SearchResult {
  char: string;
  code: string;
  splitInfo: { key: string; roots: string[] }[];
}

export default function SplitSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);

  const query = searchQuery.trim().toLowerCase();

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!query) return [];

    const results: SearchResult[] = [];
    const seenChars = new Set<string>();

    for (const item of charCodeData) {
      if (results.length >= 50) break;

      const matchChar = item.char.includes(query);
      const matchCode = item.code.toLowerCase().includes(query);

      if ((matchChar || matchCode) && !seenChars.has(item.char + item.code)) {
        seenChars.add(item.char + item.code);
        results.push({
          char: item.char,
          code: item.code,
          splitInfo: findRootsByCode(item.code),
        });
      }
    }

    return results;
  }, [query]);

  // 统计信息
  const totalChars = charCodeData.length;
  const uniqueChars = useMemo(() => new Set(charCodeData.map(d => d.char)).size, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero区 */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        <div className="container-page text-center">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium">
            <SplitSquareHorizontal className="h-4 w-4 mr-1.5" />
            汉字拆分查询
          </Badge>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 animate-slideInUp">
            拆分
            <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent"> 查询</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            输入汉字或编码，查看对应的拆分方式和字根组成
          </p>

          {/* 快速统计 */}
          <div className="mt-8 flex items-center justify-center gap-8 sm:gap-12 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            <div className="text-center">
              <div className="stat-number text-primary">{uniqueChars}</div>
              <div className="stat-label">汉字数</div>
            </div>
            <div className="w-px h-12 bg-border"></div>
            <div className="text-center">
              <div className="stat-number text-accent">{totalChars}</div>
              <div className="stat-label">编码数</div>
            </div>
            <div className="w-px h-12 bg-border"></div>
            <div className="text-center">
              <div className="stat-number">241</div>
              <div className="stat-label">字根数</div>
            </div>
          </div>
        </div>
      </section>

      {/* 搜索区 */}
      <section className="py-8 sm:py-12 sticky top-16 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container-page max-w-3xl">
          <div className="max-w-lg mx-auto">
            <div className="input-search">
              <Search className="icon" />
              <input
                type="text"
                placeholder="输入汉字或编码查询拆分..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedResult(null);
                }}
                className="w-full"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedResult(null); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* 快捷提示 */}
          {!query && (
            <div className="mt-6 grid grid-cols-3 gap-3 max-w-lg mx-auto animate-fadeIn">
              <button
                onClick={() => setSearchQuery('好')}
                className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-center"
              >
                <div className="text-2xl mb-1 root-char">好</div>
                <div className="text-xs text-muted-foreground">按汉字查</div>
              </button>
              <button
                onClick={() => setSearchQuery('a')}
                className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-center"
              >
                <div className="text-2xl mb-1 font-mono font-bold">a</div>
                <div className="text-xs text-muted-foreground">按编码查</div>
              </button>
              <button
                onClick={() => setSearchQuery('大')}
                className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-center"
              >
                <div className="text-2xl mb-1 root-char">大</div>
                <div className="text-xs text-muted-foreground">按字根查</div>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 搜索结果 */}
      <section className="py-12 sm:py-16">
        <div className="container-page max-w-5xl">
          {query && searchResults.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-muted-foreground">
                  找到 <span className="font-bold text-foreground">{searchResults.length}</span> 个结果
                </p>
              </div>

              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {searchResults.map((result, idx) => (
                  <button
                    key={`${result.char}-${result.code}-${idx}`}
                    onClick={() => setSelectedResult(result)}
                    className={cn(
                      'card-base text-left hover:border-primary/30 transition-all stagger-item cursor-pointer',
                      selectedResult?.char === result.char && selectedResult?.code === result.code
                        ? 'border-primary/50 ring-1 ring-primary/20'
                        : ''
                    )}
                    style={{ animationDelay: `${Math.min(idx, 20) * 30}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      {/* 汉字 */}
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold root-char text-primary shrink-0">
                        {result.char}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* 编码 */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-foreground text-sm uppercase">
                            {result.code}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                            {result.code.length}码
                          </Badge>
                        </div>

                        {/* 拆分预览 */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {result.splitInfo.map((s, i) => (
                            <span key={i} className="flex items-center gap-0.5">
                              {i > 0 && <span className="text-border">·</span>}
                              <span className="font-mono uppercase bg-muted px-1 rounded text-[10px]">{s.key}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {query && searchResults.length === 0 && (
            <div className="empty-state">
              <Search className="empty-state-icon" />
              <h3 className="empty-state-title">没有找到匹配结果</h3>
              <p className="empty-state-desc">尝试输入其他汉字或编码</p>
            </div>
          )}

          {!query && (
            <div className="text-center py-8 text-muted-foreground">
              <SplitSquareHorizontal className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">输入汉字或编码开始查询</p>
              <p className="text-sm">支持按汉字、编码、字根进行搜索</p>
            </div>
          )}
        </div>
      </section>

      {/* 详情弹窗 */}
      {selectedResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setSelectedResult(null)}
        >
          <div
            className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden animate-slideInUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="relative p-6 pb-4 bg-gradient-to-br from-primary/5 to-accent/5 border-b border-border/40">
              <button
                onClick={() => setSelectedResult(null)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary transition-colors btn-icon"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-4xl font-bold text-primary-foreground shadow-lg root-char">
                  {selectedResult.char}
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-1">
                    拆分详情
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">
                      <Keyboard className="h-3 w-3 mr-1" />
                      编码 {selectedResult.code.toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Hash className="h-3 w-3 mr-1" />
                      {selectedResult.code.length}码
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 space-y-5">
              {/* 拆分步骤 */}
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                  <SplitSquareHorizontal className="h-4 w-4" />
                  字根拆分
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedResult.splitInfo.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {i > 0 && (
                        <div className="text-muted-foreground/50 text-lg font-light">→</div>
                      )}
                      <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50 border border-border/60 min-w-[60px]">
                        <span className="font-mono text-lg font-bold text-primary uppercase">{s.key}</span>
                        <span className="text-[10px] text-muted-foreground mt-1">键位</span>
                        <div className="mt-1.5 flex flex-wrap gap-0.5 justify-center max-w-[80px]">
                          {s.roots.slice(0, 4).map((root, ri) => (
                            <span key={ri} className="text-xs root-char text-foreground">{root}</span>
                          ))}
                          {s.roots.length > 4 && (
                            <span className="text-[10px] text-muted-foreground">+{s.roots.length - 4}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 编码路径 */}
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                  <Keyboard className="h-4 w-4" />
                  编码路径
                </div>
                <div className="flex items-center gap-1.5 p-3 rounded-xl bg-muted/50 border border-border/60 font-mono text-lg">
                  {selectedResult.code.split('').map((letter, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      {i > 0 && <span className="text-muted-foreground/40 text-sm">+</span>}
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold uppercase">
                        {letter}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* 同编码汉字 */}
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                  <BookOpen className="h-4 w-4" />
                  同编码汉字
                </div>
                <div className="flex flex-wrap gap-2">
                  {charCodeData
                    .filter(d => d.code === selectedResult.code && d.char !== selectedResult.char)
                    .slice(0, 8)
                    .map((d, i) => (
                      <span
                        key={i}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-lg font-medium text-foreground root-char"
                      >
                        {d.char}
                      </span>
                    ))}
                  {charCodeData.filter(d => d.code === selectedResult.code && d.char !== selectedResult.char).length === 0 && (
                    <p className="text-sm text-muted-foreground">无同编码汉字</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}