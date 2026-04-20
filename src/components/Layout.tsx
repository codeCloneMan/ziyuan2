import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  BookOpen, Keyboard, Home, Image,
  Sun, Moon, Menu, X, Search,
  ExternalLink, MessageCircle, HardDrive,
  HelpCircle, PenTool,
} from 'lucide-react';
import { rootMappings } from '@/data/roots';
import { charCodeData } from '@/data/charCodeData';
import { flatFAQs } from '@/data/faqData';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/practice', label: '字根练习', icon: Keyboard },
  { path: '/whole-char', label: '整字练习', icon: PenTool },
  { path: '/table', label: '字根表', icon: BookOpen },
  { path: '/chart', label: '字根图', icon: Image },
  { path: '/faq', label: '常见问题', icon: HelpCircle },
];

const externalLinks = [
  { label: 'QQ群：261418302', href: 'https://qm.qq.com/cgi-bin/qm/qr?authKey=7vCcSmNXkf%2BpzmA5%2BVONkqLIHn5sCZQ%2BB9cju2k5FHuC3zceqm9ex4ZBCGeA6ohR&k=Clj6XiPreJ-8u0IO6TTg6QcTCJc_Rq_k&noverify=0', icon: MessageCircle },
  { label: '网盘下载', href: 'http://ziyuan.ysepan.com/', icon: HardDrive },
  { label: '宇浩测码', href: 'https://ceping.shurufa.app/', icon: ExternalLink },
  { label: 'yb测码', href: 'https://yb6b.github.io/#/', icon: ExternalLink },
  { label: '我爱打字', href: 'https://www.52dazi.cn/home', icon: ExternalLink },
  { label: '天珩字库', href: 'http://cheonhyeong.com/Simplified/download.html', icon: ExternalLink },
  { label: '汉典', href: 'https://www.zdic.net/', icon: ExternalLink },
  { label: '冰雪拼音', href: 'https://input.tansongchen.com/', icon: ExternalLink },
  { label: '汉字拆分系统', href: 'https://chaifen.app/', icon: ExternalLink },
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

  const searchResults: SearchResult[] = q
    ? [
        // 搜索字根
        ...rootMappings
          .filter(r => r.char.includes(q) || r.key === q || r.key.toUpperCase() === q.toUpperCase() || (r.desc && r.desc.includes(q)))
          .slice(0, 3)
          .map(r => ({ type: 'root' as const, char: r.char, key: r.key, desc: r.desc, isPUA: r.isPUA })),
        // 搜索汉字
        ...charCodeData
          .filter(d => d.char.includes(q) || d.code.toLowerCase().includes(q))
          .slice(0, 3)
          .map(d => ({ type: 'char' as const, char: d.char, code: d.code })),
        // 搜索FAQ
        ...flatFAQs
          .filter(faq => faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q))
          .slice(0, 4)
          .map(faq => ({ type: 'faq' as const, q: faq.q, a: faq.a, category: faq.category })),
      ]
    : [];

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between px-3 sm:px-4">
          <Link to="/" className="flex items-center gap-2 text-lg sm:text-xl font-bold text-foreground">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground text-base sm:text-lg font-bold">字</div>
            <span>字源形码</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button variant={isActive ? 'default' : 'ghost'} size="sm" className={cn('gap-1.5', isActive ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'text-muted-foreground hover:text-foreground hover:bg-accent/10')}>
                    <Icon className="h-4 w-4" />{item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-muted-foreground" onClick={() => setSearchOpen(!searchOpen)}>
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-muted-foreground" onClick={toggle}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="hidden md:block relative" ref={(node) => {
              // 点击外部关闭下拉菜单
              if (node) {
                const handleClickOutside = (e: MouseEvent) => {
                  if (!node.contains(e.target as Node)) {
                    setToolsOpen(false);
                  }
                };
                if (toolsOpen) {
                  setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
                  return () => document.removeEventListener('click', handleClickOutside);
                }
              }
            }}>
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground" onClick={() => setToolsOpen(!toolsOpen)}>
                <ExternalLink className="h-4 w-4" />更多
              </Button>
              {toolsOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-border bg-popover p-2 shadow-lg">
                  {externalLinks.map(link => {
                    const Icon = link.icon;
                    return (
                      <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-popover-foreground hover:bg-accent/10 transition-colors" onClick={() => setToolsOpen(false)}>
                        <Icon className="h-4 w-4 text-muted-foreground" />{link.label}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:hidden text-muted-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {searchOpen && (
          <div className="border-t border-border px-3 sm:px-4 py-3 bg-background/95 backdrop-blur-md">
            <div className="mx-auto max-w-xl relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="搜索字根、汉字或编码..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="border-border pl-10 focus:border-primary" autoFocus />
              {searchResults.length > 0 && (
                <div className="absolute top-full mt-2 left-0 right-0 rounded-xl border border-border bg-popover p-2 shadow-lg z-50 max-h-64 overflow-y-auto">
                  {searchResults.map((r, idx) => (
                    r.type === 'root' ? (
                      <Link
                        key={`root-${r.char}-${r.key}-${idx}`}
                        to="/table"
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent/10 transition-colors"
                        onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                      >
                        <span className="font-medium text-popover-foreground">
                          {r.isPUA && r.desc ? r.desc : r.char}
                          <span className="ml-2 text-xs text-muted-foreground">字根</span>
                        </span>
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold">
                          {r.key?.toUpperCase()}
                        </span>
                      </Link>
                    ) : r.type === 'char' ? (
                      <Link
                        key={`char-${r.char}-${r.code}-${idx}`}
                        to="/whole-char"
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent/10 transition-colors"
                        onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                      >
                        <span className="font-medium text-popover-foreground">
                          {r.char}
                          <span className="ml-2 text-xs text-muted-foreground">汉字</span>
                        </span>
                        <span className="flex items-center justify-center rounded bg-emerald-500/10 text-emerald-600 text-xs font-bold px-2 py-0.5">
                          {r.code?.toUpperCase()}
                        </span>
                      </Link>
                    ) : (
                      <Link
                        key={`faq-${idx}`}
                        to="/faq"
                        className="flex flex-col rounded-lg px-3 py-2 text-sm hover:bg-accent/10 transition-colors"
                        onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                      >
                        <span className="font-medium text-popover-foreground flex items-center gap-2">
                          <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
                          {r.q}
                          <span className="text-xs text-muted-foreground">[{r.category}]</span>
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.a}</span>
                      </Link>
                    )
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {mobileMenuOpen && (
          <div className="border-t border-border md:hidden bg-background/95 backdrop-blur-md">
            <nav className="flex flex-col p-3 gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button variant={isActive ? 'default' : 'ghost'} size="sm" className={cn('w-full justify-start gap-2', isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                      <Icon className="h-4 w-4" />{item.label}
                    </Button>
                  </Link>
                );
              })}
              <div className="border-t border-border my-2" />
              {externalLinks.map(link => {
                const Icon = link.icon;
                return (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
                      <Icon className="h-4 w-4" />{link.label}
                    </Button>
                  </a>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-border bg-card/60 py-6 sm:py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground">字源形码</p>
          <p className="mt-1">基于「字源1.31版字根」的字根记忆训练工具</p>
          <div className="mt-2 flex items-center justify-center gap-4 flex-wrap">
            <a href="https://qm.qq.com/cgi-bin/qm/qr?authKey=7vCcSmNXkf%2BpzmA5%2BVONkqLIHn5sCZQ%2BB9cju2k5FHuC3zceqm9ex4ZBCGeA6ohR&k=Clj6XiPreJ-8u0IO6TTg6QcTCJc_Rq_k&noverify=0" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">QQ群：261418302</a>
            <a href="http://ziyuan.ysepan.com/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">网盘下载</a>
            <a href="https://ceping.shurufa.app/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">宇浩测码</a>
            <a href="https://www.zdic.net/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">汉典</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
