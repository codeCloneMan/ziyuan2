import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCharCodeData, useBuiltinPhrases } from '@/lib/data-loader';
import { rootMappings } from '@/data/roots';
import { getCharSplit, getPhraseSplits } from '@/data/splitData';
import {
  Search, SplitSquareHorizontal, X, Keyboard, BookOpen, Hash,
  Layers, Type,
} from 'lucide-react';

// ============================================
// 拆分查询模式
// ============================================

type SearchMode = 'char' | 'phrase';

// ============================================
// 词组数据预处理（按频率排序的高频词）
// ============================================

interface PhraseEntry {
  phrase: string;
  freq: number;
  type: '2' | '3' | '4' | '5';
}

/** 高频词组（延迟初始化） */
let _topPhrases: PhraseEntry[] | null = null;
function getTopPhrases(phrasesData: import('@/lib/data-loader').BuiltinPhrasesData): PhraseEntry[] {
  if (_topPhrases) return _topPhrases;
  const { twoCharPhrases, twoCharFreqs, threeCharPhrases, threeCharFreqs, fourCharPhrases, fourCharFreqs, longCharPhrases, longCharFreqs } = phrasesData;
  const items: PhraseEntry[] = [];
  let i2 = 0, i3 = 0, i4 = 0, i5 = 0;
  while (i2 < twoCharPhrases.length || i3 < threeCharPhrases.length || i4 < fourCharPhrases.length || i5 < longCharPhrases.length) {
    const f2 = i2 < twoCharFreqs.length ? twoCharFreqs[i2] : -1;
    const f3 = i3 < threeCharFreqs.length ? threeCharFreqs[i3] : -1;
    const f4 = i4 < fourCharFreqs.length ? fourCharFreqs[i4] : -1;
    const f5 = i5 < longCharFreqs.length ? longCharFreqs[i5] : -1;
    if (f2 >= f3 && f2 >= f4 && f2 >= f5 && i2 < twoCharPhrases.length) {
      items.push({ phrase: twoCharPhrases[i2], freq: f2, type: '2' }); i2++;
    } else if (f3 >= f4 && f3 >= f5 && i3 < threeCharPhrases.length) {
      items.push({ phrase: threeCharPhrases[i3], freq: f3, type: '3' }); i3++;
    } else if (f4 >= f5 && i4 < fourCharPhrases.length) {
      items.push({ phrase: fourCharPhrases[i4], freq: f4, type: '4' }); i4++;
    } else if (i5 < longCharPhrases.length) {
      items.push({ phrase: longCharPhrases[i5], freq: f5, type: '5' }); i5++;
    } else break;
  }
  _topPhrases = items;
  return items;
}

/** 按短语查找单字全码（最长编码） */
function getFullCode(ch: string, charCodeData: import('@/lib/data-loader').CharCodeItem[]): string | null {
  const codes = charCodeData.filter(c => c.char === ch).map(c => c.code);
  if (codes.length === 0) return null;
  return codes.reduce((a, b) => a.length >= b.length ? a : b);
}

/** 四码词组码（与 EvaluatePage 一致） */
function getPhraseCode(phrase: string, charCodeData: import('@/lib/data-loader').CharCodeItem[]): string | null {
  const phraseLen = phrase.length;
  const fullCodes: string[] = [];
  for (const ch of phrase) {
    const fc = getFullCode(ch, charCodeData);
    if (!fc) return null;
    fullCodes.push(fc);
  }
  let extracted = '';
  if (phraseLen === 2) {
    extracted = fullCodes[0].slice(0, 2) + fullCodes[1].slice(0, 2);
  } else if (phraseLen === 3) {
    extracted = fullCodes[0].slice(0, 1) + fullCodes[1].slice(0, 1) + fullCodes[2].slice(0, 2);
  } else if (phraseLen === 4) {
    extracted = fullCodes.map(c => c.slice(0, 1)).join('');
  } else {
    extracted = fullCodes[0].slice(0, 1) + fullCodes[1].slice(0, 1)
      + fullCodes[2].slice(0, 1) + fullCodes[phraseLen - 1].slice(0, 1);
  }
  return extracted.length >= 4 ? extracted : null;
}

// ============================================
// 组件
// ============================================

export default function SplitSearchPage() {
  const { data: charCodeData } = useCharCodeData();
  const { data: phrasesData } = useBuiltinPhrases();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('char');
  const [selectedChar, setSelectedChar] = useState<string | null>(null);

  const query = searchQuery.trim();

  // ========== 单字搜索 ==========
  const charResults = useMemo(() => {
    if (!charCodeData || !query || searchMode !== 'char') return [];
    const results: { char: string; code: string; split: string | null }[] = [];
    const seen = new Set<string>();
    for (const item of charCodeData) {
      if (results.length >= 50) break;
      if (item.char.includes(query) || item.code.toLowerCase().includes(query.toLowerCase())) {
        const key = item.char + item.code;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            char: item.char,
            code: item.code,
            split: getCharSplit(item.char),
          });
        }
      }
    }
    return results;
  }, [charCodeData, query, searchMode]);

  // ========== 词组搜索 ==========
  const phraseResults = useMemo(() => {
    if (!charCodeData || !phrasesData || !query || searchMode !== 'phrase') return [];
    const TOP_PHRASES = getTopPhrases(phrasesData);
    const results: {
      phrase: string; code: string | null;
      charSplits: (string | null)[]; charCodes: (string | null)[];
    }[] = [];
    // 按词组名搜索高频词
    for (const entry of TOP_PHRASES) {
      if (results.length >= 30) break;
      if (entry.phrase.includes(query)) {
        results.push({
          phrase: entry.phrase,
          code: getPhraseCode(entry.phrase, charCodeData),
          charSplits: getPhraseSplits(entry.phrase),
          charCodes: entry.phrase.split('').map(ch => getFullCode(ch, charCodeData)),
        });
      }
    }
    return results;
  }, [query, searchMode, charCodeData, phrasesData]);

  // 选中单字的详情
  const selectedDetail = useMemo(() => {
    if (!selectedChar || !charCodeData) return null;
    const codes = charCodeData.filter(c => c.char === selectedChar).map(c => c.code);
    const split = getCharSplit(selectedChar);
    return { char: selectedChar, codes, split };
  }, [selectedChar, charCodeData]);

  // 同编码汉字（避免在 JSX 中重复 filter 128K 数据）
  const sameCodeChars = useMemo(() => {
    if (!charCodeData || !selectedDetail?.codes[0]) return [];
    return charCodeData.filter(d => d.code === selectedDetail.codes[0] && d.char !== selectedDetail.char).slice(0, 8);
  }, [selectedDetail, charCodeData]);

  const totalChars = charCodeData?.length ?? 0;
  const uniqueChars = useMemo(() => charCodeData ? new Set(charCodeData.map(d => d.char)).size : 0, [charCodeData]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero区 */}
      <section className="py-8 sm:py-16 lg:py-20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        <div className="container-page text-center">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium">
            <SplitSquareHorizontal className="h-4 w-4 mr-1.5" />
            拆分查询
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            拆分<span className="text-gradient-primary">查询</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            查询单字拆分、词组编码，支持高频词组检索
          </p>
          <div className="mt-4 sm:mt-8 grid grid-cols-2 gap-4 sm:gap-6 sm:flex sm:items-center sm:justify-center sm:gap-8 lg:gap-12">
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary font-mono-stat">{uniqueChars}</div>
              <div className="text-[11px] sm:text-xs text-muted-foreground">汉字数</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-accent font-mono-stat">{totalChars}</div>
              <div className="text-[11px] sm:text-xs text-muted-foreground">编码数</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono-stat">{rootMappings.length}</div>
              <div className="text-[11px] sm:text-xs text-muted-foreground">字根数</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-600 font-mono-stat">{phrasesData ? (phrasesData.PHRASE_COUNTS.total ?? 0).toLocaleString() : '...'}</div>
              <div className="text-[11px] sm:text-xs text-muted-foreground">词组数</div>
            </div>
          </div>
        </div>
      </section>

      {/* 搜索区 */}
      <section className="sticky top-16 z-40 bg-background border-b border-border">
        <div className="container-page max-w-3xl py-4 sm:py-6">
          {/* 模式切换 */}
          <div className="flex gap-2 justify-center mb-4">
            <Button
              variant={searchMode === 'char' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setSearchMode('char'); setSearchQuery(''); setSelectedChar(null); }}
              className="gap-1.5"
            >
              <Type className="h-4 w-4" />
              单字查询
            </Button>
            <Button
              variant={searchMode === 'phrase' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setSearchMode('phrase'); setSearchQuery(''); setSelectedChar(null); }}
              className="gap-1.5"
            >
              <Layers className="h-4 w-4" />
              词组查询
            </Button>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="input-search">
              <Search className="icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSelectedChar(null); }}
                placeholder={searchMode === 'char' ? '输入汉字或编码查询拆分...' : '输入词组查询编码和拆分...'}
                className="w-full"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedChar(null); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* 快捷提示 */}
          {!query && (
            <div className="mt-6 grid grid-cols-3 gap-3 max-w-lg mx-auto">
              {searchMode === 'char' ? (
                <>
                  <button onClick={() => setSearchQuery('好')} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center">
                    <div className="text-2xl mb-1 root-char">好</div>
                    <div className="text-xs text-muted-foreground">按汉字查</div>
                  </button>
                  <button onClick={() => setSearchQuery('a')} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center">
                    <div className="text-2xl mb-1 font-mono font-bold">a</div>
                    <div className="text-xs text-muted-foreground">按编码查</div>
                  </button>
                  <button onClick={() => setSearchQuery('大')} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center">
                    <div className="text-2xl mb-1 root-char">大</div>
                    <div className="text-xs text-muted-foreground">按字根查</div>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setSearchQuery('我们')} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center">
                    <div className="text-lg mb-1 root-char">我们</div>
                    <div className="text-xs text-muted-foreground">常用词</div>
                  </button>
                  <button onClick={() => setSearchQuery('中国')} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center">
                    <div className="text-lg mb-1 root-char">中国</div>
                    <div className="text-xs text-muted-foreground">双字词</div>
                  </button>
                  <button onClick={() => setSearchQuery('一')} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center">
                    <div className="text-lg mb-1 font-mono font-bold">一</div>
                    <div className="text-xs text-muted-foreground">高频字</div>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 搜索结果 */}
      <section className="py-6 sm:py-8">
        <div className="container-page max-w-5xl">

          {/* ===== 单字结果 ===== */}
          {searchMode === 'char' && query && charResults.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                找到 <span className="font-bold text-foreground">{charResults.length}</span> 个结果
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {charResults.map((result, idx) => (
                  <button
                    key={`${result.char}-${result.code}-${idx}`}
                    onClick={() => setSelectedChar(selectedChar === result.char ? null : result.char)}
                    className={cn(
                      'card-base text-left hover:border-primary/30 transition-all cursor-pointer',
                      selectedChar === result.char ? 'border-primary/50 ring-1 ring-primary/20' : ''
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold root-char text-primary shrink-0">
                        {result.char}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-foreground text-sm uppercase">{result.code}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">{result.code.length}码</Badge>
                        </div>
                        {/* 拆分信息 */}
                        {result.split && (
                          <div className="text-xs text-muted-foreground">
                            <span className="text-foreground/70">拆分：</span>
                            <span className="root-char">{result.split}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ===== 词组结果 ===== */}
          {searchMode === 'phrase' && query && phraseResults.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                找到 <span className="font-bold text-foreground">{phraseResults.length}</span> 个词组
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {phraseResults.map((result, idx) => (
                  <div
                    key={`${result.phrase}-${idx}`}
                    className="card-base"
                  >
                    {/* 词组名和四码编码 */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-xl font-bold root-char">{result.phrase}</div>
                      {result.code && (
                        <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">{result.code}</Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px]">{result.phrase.length}字词</Badge>
                    </div>

                    {/* 逐字拆分和编码 */}
                    <div className="space-y-1.5">
                      {result.phrase.split('').map((ch, ci) => (
                        <div key={ci} className="flex items-center gap-2 text-sm">
                          <span className="root-char font-bold text-foreground w-5 text-center">{ch}</span>
                          <span className="text-muted-foreground">→</span>
                          {/* 拆分 */}
                          <span className="root-char text-muted-foreground">
                            {result.charSplits[ci] || '—'}
                          </span>
                          <span className="text-muted-foreground/50">|</span>
                          {/* 全码 */}
                          <span className="font-mono text-xs text-primary uppercase">
                            {result.charCodes[ci] || '?'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 无结果 */}
          {query && searchMode === 'char' && charResults.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">没有找到匹配结果</p>
              <p className="text-sm">尝试输入其他汉字或编码</p>
            </div>
          )}

          {query && searchMode === 'phrase' && phraseResults.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">没有找到匹配词组</p>
              <p className="text-sm">仅支持搜索高频词组（前5万）</p>
            </div>
          )}

          {/* 未搜索 */}
          {!query && (
            <div className="text-center py-8 text-muted-foreground">
              <SplitSquareHorizontal className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">
                {searchMode === 'char' ? '输入汉字或编码开始查询' : '输入词组查询编码和拆分'}
              </p>
              <p className="text-sm">
                {searchMode === 'char' ? '支持按汉字、编码、字根进行搜索' : `共收录 ${phrasesData ? (phrasesData.PHRASE_COUNTS.total ?? 0).toLocaleString() : '...'} 个高频词组`}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ===== 单字详情弹窗 ===== */}
      {selectedDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setSelectedChar(null)}
        >
          <div
            className="w-full max-w-lg bg-card rounded-lg shadow-2xl border border-border overflow-hidden animate-slideInUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="relative p-6 pb-4 bg-card border-b border-border">
              <button
                onClick={() => setSelectedChar(null)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-primary text-4xl font-bold text-primary-foreground shadow-lg root-char">
                  {selectedDetail.char}
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-1">拆分详情</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedDetail.codes.slice(0, 3).map((code, i) => (
                      <Badge key={i} variant="outline" className="border-primary/30 text-primary bg-primary/10 font-mono">
                        <Keyboard className="h-3 w-3 mr-1" />
                        {code.toUpperCase()}
                      </Badge>
                    ))}
                    <Badge variant="secondary" className="text-xs">
                      <Hash className="h-3 w-3 mr-1" />
                      {selectedDetail.codes.length > 0 ? selectedDetail.codes[0].length : 0}码
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* 内容 */}
            <div className="p-6 space-y-5">
              {/* 拆分信息 */}
              {selectedDetail.split && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                    <SplitSquareHorizontal className="h-4 w-4" />
                    字源拆分
                  </div>
                  <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg bg-muted/50 border border-border">
                    {selectedDetail.split.split('').map((component, i) => (
                      <div key={i} className="flex items-center gap-1">
                        {i > 0 && <span className="text-muted-foreground/50">+</span>}
                        <span className="root-char text-lg font-bold text-primary">{component}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 编码路径 */}
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                  <Keyboard className="h-4 w-4" />
                  编码路径
                </div>
                <div className="flex items-center gap-1.5 p-3 rounded-lg bg-muted/50 border border-border font-mono text-lg">
                  {selectedDetail.codes[0]?.split('').map((letter, i) => (
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
              {selectedDetail.codes[0] && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                    <BookOpen className="h-4 w-4" />
                    同编码汉字
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sameCodeChars.map((d, i) => (
                      <span
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setSelectedChar(d.char); }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-lg font-medium text-foreground root-char cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        {d.char}
                      </span>
                    ))}
                    {sameCodeChars.length === 0 && (
                      <p className="text-sm text-muted-foreground">无同编码汉字</p>
                    )}
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
