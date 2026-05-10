import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Keyboard, BookOpen, Zap, Trophy, ArrowRight, Image,
  ChevronUp,
} from 'lucide-react';
import {
  practiceRootMappings, keyboardRows,
  type RootMapping,
} from '@/data/roots';

// ============================================
// 快捷导航（仿 shurufa.app 风格）
// ============================================

const navButtons = [
  { label: '字根表', link: '/table', icon: BookOpen },
  { label: '字根练习', link: '/practice', icon: Keyboard },
  { label: '字根图', link: '/chart', icon: Image },
  { label: '词组练习', link: '/phrase', icon: Zap },
  { label: '码表测评', link: '/evaluate', icon: Trophy },
];

// ============================================
// 首页组件
// ============================================

export default function HomePage() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // 每个键位的字根数据
  const keyRootsMap = useMemo(() => {
    const map = new Map<string, RootMapping[]>();
    for (const row of keyboardRows) {
      for (const key of row) {
        map.set(key, practiceRootMappings.filter(r => r.key === key));
      }
    }
    return map;
  }, []);

  // 键盘按键点击
  const handleKeyClick = useCallback((key: string) => {
    setSelectedKey(prev => prev === key ? null : key);
  }, []);

  return (
    <div className="min-h-screen">
      {/* ========================================
          Hero - 仿 shurufa.app 简洁风格
      ======================================== */}
      <section className="relative py-16 sm:py-24 lg:py-32">
        <div className="container-page relative">
          <div className="max-w-3xl mx-auto text-center">
            {/* 主标题 */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              字源形码
            </h1>

            {/* 诗意标语（仿 shurufa.app "情系汉字 沟通古今"） */}
            <p className="text-xl sm:text-2xl text-muted-foreground mb-4 tracking-wide">
              字源之理，自然成码
            </p>

            {/* 副标题 */}
            <p className="text-base sm:text-lg text-muted-foreground mb-10">
              全规范汉字偏旁部首・字源为主・选重仅7字
            </p>

            {/* 快捷导航按钮（仿 shurufa.app 横排按钮） */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {navButtons.map((btn) => {
                const Icon = btn.icon;
                return (
                  <Link key={btn.link} to={btn.link}>
                    <Button variant="outline" className="gap-2">
                      <Icon className="h-4 w-4" />
                      {btn.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          交互式键盘布局（仿 shurufa.app 键位展示）
      ======================================== */}
      <section className="pb-12">
        <div className="container-page">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">键位分布</h2>
              <p className="text-muted-foreground text-sm">
                点击按键查看对应字根
              </p>
            </div>

            {/* 键盘 */}
            <div className="space-y-2 max-w-2xl mx-auto">
              {keyboardRows.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className="flex justify-center gap-1.5 sm:gap-2"
                  style={{ paddingLeft: rowIdx * 24 }}
                >
                  {row.map((key) => {
                    const roots = keyRootsMap.get(key) || [];
                    const isSelected = selectedKey === key;
                    const firstRoots = roots.slice(0, 3).map(r => r.displayChar).join(' ');
                    return (
                      <button
                        key={key}
                        onClick={() => handleKeyClick(key)}
                        className={`
                          relative w-10 h-12 sm:w-14 sm:h-16 rounded-lg border-2
                          flex flex-col items-center justify-center
                          transition-all duration-150 cursor-pointer
                          ${isSelected
                            ? 'border-primary bg-primary/10 shadow-md scale-105'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          }
                        `}
                      >
                        <span className="text-xs sm:text-sm font-bold uppercase">
                          {key}
                        </span>
                        <span className="text-[8px] sm:text-[10px] text-muted-foreground leading-tight text-center line-clamp-2">
                          {firstRoots}
                        </span>
                        {/* 字根数量角标 */}
                        <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center font-bold">
                          {roots.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* 选中键位的详细字根列表 */}
            {selectedKey && (
              <div className="mt-6 max-w-2xl mx-auto">
                <div className="border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-muted flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold uppercase">{selectedKey}</span>
                      <span className="text-sm text-muted-foreground">
                        — {keyRootsMap.get(selectedKey)?.length || 0} 个字根
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedKey(null)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {(keyRootsMap.get(selectedKey) || []).map((root, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <span className="text-lg font-bold">{root.displayChar}</span>
                          <span className="font-mono text-xs text-muted-foreground">{root.key}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================
          核心数据 - 简洁展示
      ======================================== */}
      <section className="pb-12">
        <div className="container-page">
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { value: '329', label: '字根总数' },
                { value: '2.8', label: '平均码长' },
                { value: '7', label: 'GB2312选重', suffix: '字' },
                { value: '2-7', label: '学习周期', suffix: '天' },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-4 rounded-xl border">
                  <div className="text-2xl sm:text-3xl font-bold">
                    {stat.value}
                    {stat.suffix && <span className="text-sm text-muted-foreground ml-0.5">{stat.suffix}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          核心优势 - 简洁三列
      ======================================== */}
      <section className="pb-12">
        <div className="container-page">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">为什么选择字源形码</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  title: '好学',
                  desc: '字源为主，记一串。五行日月有序排列，识别码用拼音直觉反应。',
                  color: 'text-emerald-600',
                },
                {
                  title: '好用',
                  desc: 'GB2312选重仅7字，人体工学设计舒适，全码3码为主。',
                  color: 'text-blue-600',
                },
                {
                  title: '优美',
                  desc: '浑然天成的美感，全规范汉字偏旁部首，如同书写。',
                  color: 'text-amber-600',
                },
              ].map((item) => (
                <div key={item.title} className="text-center p-6 rounded-xl border">
                  <h3 className={`text-xl font-bold mb-2 ${item.color}`}>{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          学习路线 - 简洁版
      ======================================== */}
      <section className="pb-12">
        <div className="container-page">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">学习路线</h2>
              <p className="text-muted-foreground text-sm mt-2">
                5步科学路径，2-7天系统掌握
              </p>
            </div>
            <div className="space-y-3">
              {[
                { num: '1', title: '认识字根', desc: '查看字根表，了解329个字根的分布规律', link: '/table', time: '20分钟' },
                { num: '2', title: '记忆字根', desc: '科学渐进式练习，逐步掌握全部字根', link: '/practice', time: '1-2天' },
                { num: '3', title: '练习巩固', desc: '通过错题回顾和反复练习巩固记忆', link: '/practice', time: '2-3天' },
                { num: '4', title: '整字输入', desc: '从字根到整字，练习汉字编码拆分', link: '/whole-char', time: '3-5天' },
                { num: '5', title: '实战打字', desc: '安装输入法，在实际打字中流畅运用', link: '/faq', time: '持续练习' },
              ].map((step) => (
                <Link key={step.num} to={step.link} className="block group">
                  <div className="flex items-center gap-4 p-4 rounded-xl border hover:border-primary/50 hover:bg-muted/30 transition-all">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{step.num}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold group-hover:text-primary transition-colors">{step.title}</h3>
                        <span className="text-xs text-muted-foreground">{step.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{step.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          页脚 CTA
      ======================================== */}
      <section className="pb-16">
        <div className="container-page text-center">
          <Link to="/practice">
            <Button size="lg" className="gap-2 px-8">
              <Zap className="h-5 w-5" />
              开始练习
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
