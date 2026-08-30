import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  BookOpen, Keyboard, Home, Image,
  Sun, Moon, Menu, X, Search,
  ExternalLink, MessageCircle, HardDrive,
  HelpCircle, PenTool, BarChart3, TextQuote,
  Download, Upload, ChevronDown,
} from 'lucide-react';
import { rootMappings } from '@/data/roots';
import { useCharCodeData, buildCharCodeIndex, type CharCodeIndex } from '@/lib/data-loader';
import { flatFAQs } from '@/data/faqData';
import { downloadProgress, importProgressFromFile } from '@/store/progress-store';
import UserLevelBadge from '@/components/UserLevelBadge';
import AchievementToast from '@/components/AchievementToast';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/practice', label: '字根练习', icon: Keyboard },
  { path: '/whole-char', label: '整字练习', icon: PenTool },
  { path: '/phrase', label: '词组练习', icon: TextQuote },
];

const toolItems = [
  { path: '/table', label: '字根表', icon: BookOpen },
  { path: '/chart', label: '字根图', icon: Image },
  { path: '/split-search', label: '拆分查询', icon: Search },
  { path: '/evaluate', label: '码表测评', icon: BarChart3 },
  { path: '/faq', label: '常见问题', icon: HelpCircle },
];

const externalLinks = [
  { label: 'QQ群', href: 'https://qm.qq.com/cgi-bin/qm/qr?authKey=7vCcSmNXkf%2BpzmA5%2BVONkqLIHn5sCZQ%2BB9cju2k5FHuC3zceqm9ex4ZBCGeA6ohR&k=Clj6XiPreJ-8u0IO6TTg6QcTCJc_Rq_k&noverify=0', icon: MessageCircle },
  { label: '网盘下载', href: 'http://ziyuan.ysepan.com/', icon: HardDrive },
  { label: '宇浩测码', href: 'https://ceping.shurufa.app/', icon: ExternalLink },
  { label: 'yb测码', href: 'https://yb6b.github.io/#/', icon: ExternalLink },
  { label: '我爱打字', href: 'https://www.52dazi.cn/home', icon: ExternalLink },
  { label: '天珩字库', href: 'http://cheonhyeong.com/Simplified/download.html', icon: ExternalLink },
  { label: '汉典', href: 'https://www.zdic.net/', icon: ExternalLink },
  { label: '冰雪拼音', href: 'https://input.tansongchen.com/', icon: ExternalLink },
  { label: '汉字拆分系统', href: 'https://chaifen.app/', icon: ExternalLink },
  { label: '好码测评', href: 'https://chs.hertz.ltd/#evaluate', icon: ExternalLink },
  { label: '虎测评', href: 'https://assess.tiger-code.com/', icon: ExternalLink },
];

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('ziyuan-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('ziyuan-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  return { theme, toggle };
}

export default function Layout() {
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [navToolsOpen, setNavToolsOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const navToolsRef = useRef<HTMLDivElement>(null);

  interface SearchResult {
    type: 'root' | 'char' | 'faq';
    char?: string;
    key?: string;
    code?: string;
    desc?: string;
    isPUA?: boolean;
    q?: string;
    a?: string;
    category?: string;
  }

  const { data: charCodeData } = useCharCodeData();

  const charCodeIndex = useMemo<CharCodeIndex | null>(
    () => charCodeData ? buildCharCodeIndex(charCodeData) : null,
    [charCodeData],
  );

  const q = searchQuery.trim().toLowerCase();

  const searchResults: SearchResult[] = useMemo(() => {
    if (!q) return [];
    const charResults = charCodeIndex
      ? (() => {
          const results: SearchResult[] = [];
          const exact = charCodeIndex.get(q);
          if (exact) {
            for (const item of exact) {
              if (results.length >= 3) break;
              results.push({ type: 'char' as const, char: item.char, code: item.code });
            }
          }
          if (results.length < 3) {
            for (const items of charCodeIndex.values()) {
              for (const item of items) {
                if (results.length >= 3) break;
                if (item.code.toLowerCase().startsWith(q) && !results.some(r => r.char === item.char)) {
                  results.push({ type: 'char' as const, char: item.char, code: item.code });
                }
              }
              if (results.length >= 3) break;
            }
          }
          return results;
        })()
      : [];

    return [
      ...rootMappings
        .filter(r => r.char.includes(q) || r.key === q || r.key.toUpperCase() === q.toUpperCase() || (r.desc && r.desc.includes(q)))
        .slice(0, 3)
        .map(r => ({ type: 'root' as const, char: r.char, key: r.key, desc: r.desc, isPUA: r.isPUA })),
      ...charResults,
      ...flatFAQs
        .filter(faq => faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q))
        .slice(0, 4)
        .map(faq => ({ type: 'faq' as const, q: faq.q, a: faq.a, category: faq.category })),
    ];
  }, [q, charCodeIndex]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
      if (navToolsRef.current && !navToolsRef.current.contains(e.target as Node)) {
        setNavToolsOpen(false);
      }
    }

    if (searchOpen || toolsOpen || navToolsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [searchOpen, toolsOpen, navToolsOpen]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setToolsOpen(false);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  // 全局快捷键：按 / 打开搜索并聚焦（工具站通用习惯，提升检索效率）
  useEffect(() => {
    function handleSlash(e: KeyboardEvent) {
      // 输入框内不拦截（避免打断正在输入的内容）
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setSearchOpen(true);
        setToolsOpen(false);
        setMobileMenuOpen(false);
        // 等搜索栏渲染后聚焦输入框
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>('[data-global-search-input]');
          input?.focus();
        }, 0);
      }
    }
    document.addEventListener('keydown', handleSlash);
    return () => document.removeEventListener('keydown', handleSlash);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 导航栏 - 毛玻璃质感 */}
      <header className="sticky top-0 z-50 border-b border-border/60 glass-nav bg-background/98 safe-top">
        <div className="mx-auto flex h-14 items-center justify-between px-4 sm:px-6 max-w-[1600px]">
          {/* Logo - 更精致 */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            onClick={() => {
              setMobileMenuOpen(false);
              setSearchOpen(false);
            }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[hsl(230_60%_38%)] text-white transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:scale-105 group-hover:rotate-3">
              <span className="text-sm font-bold root-char">字</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-base font-bold tracking-tight" style={{ fontFamily: "'Noto Serif SC', serif" }}>字源形码</span>
            </div>
          </Link>

          {/* 桌面导航 - 更克制 */}
          <nav className="hidden lg:flex items-center gap-0.5 ml-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <button
                    className={cn(
                      'relative px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'text-primary bg-primary/[0.08] shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.18)]'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </span>
                  </button>
                </Link>
              );
            })}

            {/* 工具下拉 */}
            <div className="relative" ref={navToolsRef}>
              <button
                onClick={() => setNavToolsOpen(!navToolsOpen)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1',
                  toolItems.some(t => t.path === location.pathname)
                    ? 'text-primary bg-primary/8'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
                工具
                <ChevronDown className={cn('h-3 w-3 transition-transform', navToolsOpen && 'rotate-180')} />
              </button>
              {navToolsOpen && (
                <div className="absolute top-full left-0 mt-2 w-44 py-1.5 bg-popover/95 glass border border-border/70 rounded-xl shadow-xl animate-fade-in z-50">
                  {toolItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setNavToolsOpen(false)}>
                        <div className={cn(
                          'flex items-center gap-2 px-3 py-2 mx-1 rounded-lg text-sm transition-colors',
                          isActive ? 'text-primary bg-primary/[0.07]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                        )}>
                          <Icon className="h-3.5 w-3.5" />
                          {item.label}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* 右侧操作区 - 更紧凑 */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <UserLevelBadge />

            <button
              onClick={() => {
                setSearchOpen(!searchOpen);
                setToolsOpen(false);
              }}
              className={cn(
                'h-8 w-8 flex items-center justify-center rounded-md transition-colors relative group',
                searchOpen
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )}
              title="全局搜索（快捷键 /）"
            >
              <Search className="h-3.5 w-3.5" />
              <kbd className="hidden sm:inline absolute -bottom-0.5 -right-0.5 px-0.5 rounded bg-muted border border-border/60 text-[8px] font-mono text-muted-foreground/70 leading-tight">/</kbd>
            </button>

            <button
              onClick={toggle}
              className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 transition-transform duration-500 hover:rotate-90" />
              ) : (
                <Moon className="h-3.5 w-3.5 transition-transform duration-500 hover:-rotate-12" />
              )}
            </button>

            {/* 更多链接 - 仅桌面端 */}
            <div className="hidden md:block relative" ref={toolsRef}>
              <button
                onClick={() => {
                  setToolsOpen(!toolsOpen);
                  setSearchOpen(false);
                }}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors',
                  toolsOpen
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                )}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>更多</span>
              </button>

              {toolsOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-50 w-60 rounded-lg border border-border/70 bg-popover shadow-xl animate-fade-in overflow-hidden">
                  <div className="p-1.5 max-h-[400px] overflow-y-auto">
                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                      外部资源
                    </div>
                    {externalLinks.map((link, idx) => {
                      const Icon = link.icon;
                      return (
                        <a
                          key={link.label}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-popover-foreground hover:bg-secondary/40 transition-colors stagger-item"
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{link.label}</span>
                          <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground/40 shrink-0" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        {searchOpen && (
          <div className="border-t border-border/50 bg-background/90 glass animate-fade-in">
            <div className="mx-auto max-w-2xl px-4 py-4" ref={searchRef}>
              <div className="input-search mb-3">
                <Search className="icon" />
                <input
                  type="text"
                  placeholder="搜索字根、汉字或编码...（快捷键 /）"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                  autoFocus
                  data-global-search-input
                />
              </div>

              {searchResults.length > 0 && (
                <div className="rounded-lg border border-border/70 bg-popover shadow-lg overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto p-1.5 space-y-0.5">
                    {searchResults.map((r, idx) =>
                      r.type === 'root' ? (
                        <Link
                          key={`root-${r.char}-${r.key}-${idx}`}
                          to="/table"
                          className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-secondary/40 transition-colors stagger-item"
                          style={{ animationDelay: `${idx * 30}ms` }}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-popover-foreground root-char text-base">
                              {r.isPUA && r.desc ? r.desc : r.char}
                            </span>
                            <Badge variant="secondary" className="shrink-0 text-xs bg-primary/8 text-primary">
                              字根
                            </Badge>
                          </div>
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/8 text-primary text-xs font-bold shrink-0">
                            {r.key?.toUpperCase()}
                          </span>
                        </Link>
                      ) : r.type === 'char' ? (
                        <Link
                          key={`char-${r.char}-${r.code}-${idx}`}
                          to="/whole-char"
                          className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-secondary/40 transition-colors stagger-item"
                          style={{ animationDelay: `${idx * 30}ms` }}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-popover-foreground text-base root-char">
                              {r.char}
                            </span>
                            <Badge variant="secondary" className="shrink-0 text-xs bg-accent/10 text-accent">
                              汉字
                            </Badge>
                          </div>
                          <span className="flex items-center justify-center rounded bg-accent/8 text-accent text-xs font-bold px-2 py-0.5 shrink-0">
                            {r.code?.toUpperCase()}
                          </span>
                        </Link>
                      ) : (
                        <Link
                          key={`faq-${idx}`}
                          to="/faq"
                          className="flex flex-col rounded-md px-3 py-2.5 text-sm hover:bg-secondary/40 transition-colors stagger-item"
                          style={{ animationDelay: `${idx * 30}ms` }}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <HelpCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span className="font-medium text-popover-foreground truncate">
                              {r.q}
                            </span>
                            <Badge variant="outline" className="shrink-0 text-xs border-amber-500/25 text-amber-600">
                              {r.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {r.a}
                          </p>
                        </Link>
                      )
                    )}
                  </div>
                </div>
              )}

              {searchResults.length === 0 && q && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  未找到相关结果
                </div>
              )}

              {!q && (
                <div className="grid grid-cols-3 gap-3 py-2">
                  <div className="text-center p-3 rounded-lg bg-muted/40">
                    <Keyboard className="h-4 w-4 mx-auto mb-1.5 text-primary" />
                    <div className="text-xs font-medium text-foreground">字根</div>
                    <div className="text-[10px] text-muted-foreground"><span className="font-mono-stat">{rootMappings.length}</span>个</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/40">
                    <PenTool className="h-4 w-4 mx-auto mb-1.5 text-accent" />
                    <div className="text-xs font-medium text-foreground">汉字</div>
                    <div className="text-[10px] text-muted-foreground">{charCodeData ? <><span className="font-mono-stat">{charCodeData.length}</span>个</> : '...'}</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/40">
                    <HelpCircle className="h-4 w-4 mx-auto mb-1.5 text-amber-500" />
                    <div className="text-xs font-medium text-foreground">问答</div>
                    <div className="text-[10px] text-muted-foreground"><span className="font-mono-stat">{flatFAQs.length}</span>条</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 移动端菜单 */}
        {mobileMenuOpen && (
          <div className="border-t border-border/50 lg:hidden bg-background/90 glass animate-slide-in-up">
            <nav className="max-h-[60vh] overflow-y-auto p-3 space-y-1">
              <div className="space-y-0.5 mb-3">
                {navItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path}>
                      <button
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left text-sm font-medium transition-colors stagger-item',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                        )}
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>

                        {isActive && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                        )}
                      </button>
                    </Link>
                  );
                })}
              </div>

              <div className="border-t border-border/40 pt-3 space-y-0.5">
                <div className="px-3 pb-1.5">
                  <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
                    工具
                  </span>
                </div>
                {toolItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path}>
                      <button
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm transition-colors',
                          isActive
                            ? 'text-primary bg-primary/5'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    </Link>
                  );
                })}
              </div>

              <div className="border-t border-border/40 pt-3 space-y-0.5">
                <div className="px-3 pb-1.5">
                  <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
                    外部资源
                  </span>
                </div>

                {externalLinks.slice(0, 6).map((link, idx) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors stagger-item"
                      style={{ animationDelay: `${(idx + navItems.length) * 30}ms` }}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{link.label}</span>
                      <ExternalLink className="h-3 w-3 ml-auto opacity-30" />
                    </a>
                  );
                })}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setSearchOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-primary bg-primary/8 hover:bg-primary/15 transition-colors mt-1"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>搜索</span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* 主内容区 */}
      <main className="animate-page-enter">
        <Outlet />
      </main>

      {/* 页脚 - 文化感 */}
      <footer className="relative border-t border-border/60 bg-muted/20 mt-16 safe-bottom">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* 品牌信息 - 增加文化感 */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white text-xs font-bold shadow-sm">
                  字
                </div>
                <span className="text-base font-bold" style={{ fontFamily: "'Noto Serif SC', serif" }}>字源形码</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                字源为基，形码入道
              </p>
              <p className="text-xs text-muted-foreground/60 mt-2 leading-relaxed">
                基于「字源1.32版字根」的专业字根记忆训练平台
              </p>
            </div>

            {/* 快速链接 */}
            <div>
              <h3 className="font-semibold text-foreground mb-4 text-sm" style={{ fontFamily: "'Noto Serif SC', serif" }}>快速链接</h3>
              <ul className="space-y-2">
                {[
                  { label: '首页', path: '/' },
                  { label: '字根练习', path: '/practice' },
                  { label: '整字练习', path: '/whole-char' },
                  { label: '字根表', path: '/table' },
                ].map(item => (
                  <li key={item.label}>
                    <Link to={item.path} className="text-sm text-muted-foreground hover:text-foreground transition-all inline-block">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 外部资源 */}
            <div>
              <h3 className="font-semibold text-foreground mb-4 text-sm" style={{ fontFamily: "'Noto Serif SC', serif" }}>外部资源</h3>
              <ul className="space-y-2">
                {[
                  { label: 'QQ群', href: 'https://qm.qq.com/cgi-bin/qm/qr?authKey=7vCcSmNXkf%2BpzmA5%2BVONkqLIHn5sCZQ%2BB9cju2k5FHuC3zceqm9ex4ZBCGeA6ohR&k=Clj6XiPreJ-8u0IO6TTg6QcTCJc_Rq_k&noverify=0' },
                  { label: '网盘下载', href: 'http://ziyuan.ysepan.com/' },
                  { label: '宇浩测码', href: 'https://ceping.shurufa.app/' },
                  { label: '汉典', href: 'https://www.zdic.net/' },
                ].map(link => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-all inline-flex items-center gap-1 group"
                    >
                      {link.label}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* 联系方式与备份 */}
            <div>
              <h3 className="font-semibold text-foreground mb-4 text-sm" style={{ fontFamily: "'Noto Serif SC', serif" }}>联系方式</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://qm.qq.com/cgi-bin/qm/qr?authKey=7vCcSmNXkf%2BpzmA5%2BVONkqLIHn5sCZQ%2BB9cju2k5FHuC3zceqm9ex4ZBCGeA6ohR&k=Clj6XiPreJ-8u0IO6TTg6QcTCJc_Rq_k&noverify=0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    QQ群：261418302
                  </a>
                </li>
              </ul>

              <div className="mt-4 pt-4 border-t border-border/30">
                <h4 className="text-xs font-medium text-muted-foreground/70 mb-2">进度备份</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadProgress()}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-border/40 transition-colors"
                  >
                    <Download className="h-3 w-3" />导出
                  </button>
                  <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-border/40 transition-colors cursor-pointer">
                    <Upload className="h-3 w-3" />导入
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const result = await importProgressFromFile(file);
                        if (result.success) {
                          alert('进度导入成功，页面将刷新');
                          window.location.reload();
                        } else {
                          alert(`导入失败：${result.error || '未知错误'}`);
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/30">
                <p className="text-xs text-muted-foreground/50">
                  © {new Date().getFullYear()} 字源形码
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* 成就解锁提示 */}
      <AchievementToast />
    </div>
  );
}
