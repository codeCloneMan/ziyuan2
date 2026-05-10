import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  BookOpen, Keyboard, Home, Image,
  Sun, Moon, Menu, X, Search,
  ExternalLink, MessageCircle, HardDrive,
  HelpCircle, PenTool, BarChart3, TextQuote,
} from 'lucide-react';
import { rootMappings } from '@/data/roots';
import { charCodeData } from '@/data/charCodeData';
import { flatFAQs } from '@/data/faqData';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/practice', label: '字根练习', icon: Keyboard },
  { path: '/whole-char', label: '整字练习', icon: PenTool },
  { path: '/phrase', label: '词组练习', icon: TextQuote },
  { path: '/table', label: '字根表', icon: BookOpen },
  { path: '/chart', label: '字根图', icon: Image },
  { path: '/evaluate', label: '码表测评', icon: BarChart3 },
  { path: '/split-search', label: '拆分查询', icon: Search },
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
  
  const searchRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  // 搜索结果：字根、汉字和FAQ
  interface SearchResult {
    type: 'root' | 'char' | 'faq';
    char?: string;
    key?: string;
    code?: string;
    desc?: string;
    isPUA?: boolean;
    q?: string;  // FAQ问题
    a?: string;  // FAQ答案
    category?: string;  // FAQ分类
  }

  const q = searchQuery.trim().toLowerCase();

  const searchResults: SearchResult[] = useMemo(() => q
    ? [
        ...rootMappings
          .filter(r => r.char.includes(q) || r.key === q || r.key.toUpperCase() === q.toUpperCase() || (r.desc && r.desc.includes(q)))
          .slice(0, 3)
          .map(r => ({ type: 'root' as const, char: r.char, key: r.key, desc: r.desc, isPUA: r.isPUA })),
        ...charCodeData
          .filter(d => d.char.includes(q) || d.code.toLowerCase().includes(q))
          .slice(0, 3)
          .map(d => ({ type: 'char' as const, char: d.char, code: d.code })),
        ...flatFAQs
          .filter(faq => faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q))
          .slice(0, 4)
          .map(faq => ({ type: 'faq' as const, q: faq.q, a: faq.a, category: faq.category })),
      ]
    : [], [q]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    }

    if (searchOpen || toolsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [searchOpen, toolsOpen]);

  // ESC键关闭所有弹窗
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 导航栏 */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md transition-all duration-200">
        <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 max-w-[1600px]">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2.5 group"
            onClick={() => {
              setMobileMenuOpen(false);
              setSearchOpen(false);
            }}
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-500 text-white shadow-md group-hover:shadow-lg transition-shadow duration-300">
              <span className="text-base font-bold">字</span>
              <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold tracking-tight">字源形码</span>
            </div>
          </Link>

          {/* 桌面导航 */}
          <nav className="hidden lg:flex items-center gap-1 ml-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <button
                    className={cn(
                      'relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/10'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    
                    {/* 活动指示器 */}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary" />
                    )}
                  </button>
                </Link>
              );
            })}
          </nav>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* 搜索按钮 */}
            <button
              onClick={() => {
                setSearchOpen(!searchOpen);
                setToolsOpen(false);
              }}
              className={cn(
                'h-9 w-9 flex items-center justify-center rounded-xl transition-colors',
                searchOpen
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/10'
              )}
            >
              <Search className="h-4 w-4" />
            </button>

            {/* 主题切换 */}
            <button
              onClick={toggle}
              className="h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {/* 更多链接 - 仅桌面端显示 */}
            <div className="hidden md:block relative" ref={toolsRef}>
              <button
                onClick={() => {
                  setToolsOpen(!toolsOpen);
                  setSearchOpen(false);
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                  toolsOpen
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/10'
                )}
              >
                <ExternalLink className="h-4 w-4" />
                <span>更多</span>
              </button>

              {/* 下拉菜单 */}
              {toolsOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-border bg-popover shadow-xl animate-fadeIn overflow-hidden">
                  <div className="p-2 max-h-[400px] overflow-y-auto">
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-popover-foreground hover:bg-accent/10 transition-colors stagger-item"
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{link.label}</span>
                          <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground/50 shrink-0" />
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
              className="lg:hidden h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* 搜索栏展开区域 */}
        {searchOpen && (
          <div className="border-t border-border bg-background/95 backdrop-blur-md animate-fadeIn">
            <div className="mx-auto max-w-2xl px-4 py-4" ref={searchRef}>
              {/* 搜索输入框 */}
              <div className="input-search mb-3">
                <Search className="icon" />
                <input
                  type="text"
                  placeholder="搜索字根、汉字或编码..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                  autoFocus
                />
              </div>

              {/* 搜索结果 */}
              {searchResults.length > 0 && (
                <div className="rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto p-2 space-y-1">
                    {searchResults.map((r, idx) =>
                      r.type === 'root' ? (
                        <Link
                          key={`root-${r.char}-${r.key}-${idx}`}
                          to="/table"
                          className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-accent/10 transition-colors stagger-item"
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
                            <Badge variant="secondary" className="shrink-0 text-xs bg-primary/10 text-primary">
                              字根
                            </Badge>
                          </div>
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold shrink-0">
                            {r.key?.toUpperCase()}
                          </span>
                        </Link>
                      ) : r.type === 'char' ? (
                        <Link
                          key={`char-${r.char}-${r.code}-${idx}`}
                          to="/whole-char"
                          className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-accent/10 transition-colors stagger-item"
                          style={{ animationDelay: `${idx * 30}ms` }}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-popover-foreground text-base">
                              {r.char}
                            </span>
                            <Badge variant="secondary" className="shrink-0 text-xs bg-emerald-500/10 text-emerald-600">
                              汉字
                            </Badge>
                          </div>
                          <span className="flex items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 text-xs font-bold px-2 py-1 shrink-0">
                            {r.code?.toUpperCase()}
                          </span>
                        </Link>
                      ) : (
                        <Link
                          key={`faq-${idx}`}
                          to="/faq"
                          className="flex flex-col rounded-lg px-3 py-2.5 text-sm hover:bg-accent/10 transition-colors stagger-item"
                          style={{ animationDelay: `${idx * 30}ms` }}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <HelpCircle className="h-4 w-4 text-amber-500 shrink-0" />
                            <span className="font-medium text-popover-foreground truncate">
                              {r.q}
                            </span>
                            <Badge variant="outline" className="shrink-0 text-xs border-amber-500/30 text-amber-600">
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
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <Keyboard className="h-5 w-5 mx-auto mb-1.5 text-primary" />
                    <div className="text-xs font-medium text-foreground">字根</div>
                    <div className="text-[10px] text-muted-foreground">{rootMappings.length}个</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <PenTool className="h-5 w-5 mx-auto mb-1.5 text-emerald-600" />
                    <div className="text-xs font-medium text-foreground">汉字</div>
                    <div className="text-[10px] text-muted-foreground">{charCodeData.length}个</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <HelpCircle className="h-5 w-5 mx-auto mb-1.5 text-amber-500" />
                    <div className="text-xs font-medium text-foreground">问答</div>
                    <div className="text-[10px] text-muted-foreground">{flatFAQs.length}条</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 移动端菜单 */}
        {mobileMenuOpen && (
          <div className="border-t border-border lg:hidden bg-background/95 backdrop-blur-md animate-slideInUp">
            <nav className="max-h-[60vh] overflow-y-auto p-4 space-y-1">
              {/* 导航链接 */}
              <div className="space-y-1 mb-4">
                {navItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path}>
                      <button
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-colors stagger-item',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/10'
                        )}
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span>{item.label}</span>
                        
                        {isActive && (
                          <span className="ml-auto h-2 w-2 rounded-full bg-primary-foreground" />
                        )}
                      </button>
                    </Link>
                  );
                })}
              </div>

              {/* 分隔线 */}
              <div className="border-t border-border pt-4 space-y-1">
                <div className="px-4 pb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors stagger-item"
                      style={{ animationDelay: `${(idx + navItems.length) * 30}ms` }}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{link.label}</span>
                      <ExternalLink className="h-3 w-3 ml-auto opacity-40" />
                    </a>
                  );
                })}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setSearchOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors mt-2"
                >
                  <Search className="h-4 w-4" />
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

      {/* 页脚 */}
      <footer className="border-t border-border bg-muted/30 mt-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* 品牌信息 */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Link to="/" className="inline-flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-emerald-500 text-white text-sm font-bold">
                  字
                </div>
                <span className="text-lg font-bold">字源形码</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                基于「字源1.32版字根」的专业字根记忆训练平台
              </p>
            </div>

            {/* 快速链接 */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">快速链接</h3>
              <ul className="space-y-2.5">
                {[
                  { label: '首页', path: '/' },
                  { label: '字根练习', path: '/practice' },
                  { label: '整字练习', path: '/whole-char' },
                  { label: '字根表', path: '/table' },
                ].map(item => (
                  <li key={item.label}>
                    <Link to={item.path} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 外部资源 */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">外部资源</h3>
              <ul className="space-y-2.5">
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
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                    >
                      {link.label}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* 联系方式 */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">联系我们</h3>
              <ul className="space-y-2.5">
                <li>
                  <a 
                    href="https://qm.qq.com/cgi-bin/qm/qr?authKey=7vCcSmNXkf%2BpzmA5%2BVONkqLIHn5sCZQ%2BB9cju2k5FHuC3zceqm9ex4ZBCGeA6ohR&k=Clj6XiPreJ-8u0IO6TTg6QcTCJc_Rq_k&noverify=0" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                  >
                    <MessageCircle className="h-4 w-4" />
                    QQ群：261418302
                  </a>
                </li>
              </ul>
              
              <div className="mt-4 pt-4 border-t border-border/60">
                <p className="text-xs text-muted-foreground">
                  © {new Date().getFullYear()} 字源形码 · 用心打造
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}