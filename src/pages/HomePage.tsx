import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Keyboard, BookOpen, Zap, ArrowRight, Image,
  ChevronUp, Sparkles, Heart, Pen, Quote,
} from 'lucide-react';
import {
  practiceRootMappings, keyboardRows,
  type RootMapping,
} from '@/data/roots';

// ============================================
// 快捷导航
// ============================================

const navButtons = [
  { label: '字根表', link: '/table', icon: BookOpen },
  { label: '字根练习', link: '/practice', icon: Keyboard },
  { label: '字根图', link: '/chart', icon: Image },
  { label: '词组练习', link: '/phrase', icon: Zap },
];

// ============================================
// 学习路线数据
// ============================================

const learningSteps = [
  { num: '壹', title: '认识字根', desc: '查看字根表，了解 329 个字根的分布规律', link: '/table', time: '20 分钟', color: 'from-violet-500 to-purple-500' },
  { num: '贰', title: '记忆字根', desc: '科学渐进式练习，逐步掌握全部字根', link: '/practice', time: '1-2 天', color: 'from-blue-500 to-indigo-500' },
  { num: '叁', title: '练习巩固', desc: '通过错题回顾和反复练习巩固记忆', link: '/practice', time: '2-3 天', color: 'from-cyan-500 to-blue-500' },
  { num: '肆', title: '整字输入', desc: '从字根到整字，练习汉字编码拆分', link: '/whole-char', time: '3-5 天', color: 'from-teal-500 to-emerald-500' },
  { num: '伍', title: '实战打字', desc: '安装输入法，在实际打字中流畅运用', link: '/faq', time: '持续练习', color: 'from-emerald-500 to-green-500' },
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
          Hero - 诗意叙事（参考 shurufa.app）
      ======================================== */}
      <section className="relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-16 left-1/4 w-80 h-80 bg-primary/[0.04] rounded-full blur-[100px]" />
          <div className="absolute top-32 right-1/6 w-96 h-96 bg-amber-500/[0.04] rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-t from-primary/[0.02] to-transparent rounded-full blur-[80px]" />
        </div>

        <div className="container-page relative pt-20 sm:pt-28 lg:pt-36 pb-20">
          <div className="max-w-3xl mx-auto text-center">

            {/* 诗意徽章 */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/[0.06] border border-primary/10 text-primary text-sm font-medium mb-8 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>基于字源逻辑 · 全规范偏旁部首</span>
            </div>

            {/* 主标题 */}
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-8 bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
              字源形码
            </h1>

            {/* 副标题 */}
            <p className="text-xl sm:text-2xl lg:text-3xl text-muted-foreground mb-6 tracking-wide font-light">
              字源之理，自然成码
            </p>

            {/* 诗意描述 */}
            <p className="text-base sm:text-lg text-muted-foreground/70 max-w-xl mx-auto mb-12 leading-relaxed">
              当你连续按下一个汉字中若干部首
              <br className="hidden sm:block" />
              这个汉字便会跳到屏幕上
            </p>

            {/* 快捷导航按钮 */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {navButtons.map((btn) => {
                const Icon = btn.icon;
                return (
                  <Link key={btn.link} to={btn.link}>
                    <Button variant="outline" size="lg" className="gap-2 rounded-full px-6">
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
          关于 - 情感叙事（原创文案）
      ======================================== */}
      <section className="py-20 sm:py-28">
        <div className="container-page">
          <div className="max-w-2xl mx-auto">
            {/* 引言装饰 */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Pen className="h-5 w-5 text-primary" />
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-foreground">关于字源形码</h2>

            <div className="space-y-5 text-muted-foreground leading-[1.9] text-base sm:text-lg">
              <p>
                汉字是世界上最古老的文字之一，每一个字都承载着数千年的智慧。
                从甲骨文到楷书，汉字的构造蕴含着先人对万物的理解与归纳。
              </p>

              <p>
                字源形码正是基于这种理解——我们将汉字拆解为 329 个基本字根，
                按照字源逻辑分配到 26 个键位上。当你打字时，
                不是在选择候选列表，而是在「书写」每一个字。
              </p>

              {/* 引用金句 */}
              <div className="my-10 px-6 py-5 rounded-2xl bg-primary/[0.04] border border-primary/10 relative">
                <Quote className="absolute top-4 left-4 h-5 w-5 text-primary/30" />
                <p className="text-lg sm:text-xl text-foreground font-medium leading-relaxed pl-6">
                  每一个汉字，都基本对应着唯一编码——
                  <br />
                  你不需要停下来选择，就像写字时一样自然。
                </p>
              </div>

              <p>
                全规范的偏旁部首，符合书写习惯的拆分方式，
                让你在键盘上也能感受到一笔一划的节奏感。
                不必纠结读音，不必翻页选字，
                指尖落下，字便浮现。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          交互式键盘布局
      ======================================== */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="container-page">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">键位分布</h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                329 个字根，分布在 26 键上——点击按键，探索字根世界
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
                            : 'border-border bg-background hover:border-primary/50 hover:bg-muted/50'
                          }
                        `}
                      >
                        <span className="text-xs sm:text-sm font-bold uppercase">{key}</span>
                        <span className="text-[8px] sm:text-[10px] text-muted-foreground leading-tight text-center line-clamp-2">
                          {firstRoots}
                        </span>
                        <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center font-bold">
                          {roots.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* 选中键位详情 */}
            {selectedKey && (
              <div className="mt-6 max-w-2xl mx-auto">
                <div className="border rounded-xl overflow-hidden bg-background">
                  <div className="px-4 py-3 bg-muted/50 flex items-center justify-between">
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
          核心优势 - 情感化表达
      ======================================== */}
      <section className="py-16 sm:py-20">
        <div className="container-page">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">好学 · 好用 · 优美</h2>
              <p className="text-muted-foreground text-sm sm:text-base">三位一体的输入体验</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
              {[
                {
                  icon: Heart,
                  title: '好学易记',
                  desc: '字源为主，记一串。五行日月有序排列，识别码用拼音直觉反应，最快 2 天掌握全部字根。',
                  gradient: 'from-emerald-500 to-teal-500',
                  bg: 'bg-emerald-50/50 dark:bg-emerald-950/10',
                  border: 'border-emerald-200/60 dark:border-emerald-800/40',
                },
                {
                  icon: Zap,
                  title: '高效低重',
                  desc: '全码 3 码为主，平均码长 2.8。GB2312 选重仅 7 字，人体工学设计，手感舒适。',
                  gradient: 'from-blue-500 to-indigo-500',
                  bg: 'bg-blue-50/50 dark:bg-blue-950/10',
                  border: 'border-blue-200/60 dark:border-blue-800/40',
                },
                {
                  icon: Sparkles,
                  title: '优美自然',
                  desc: '浑然天成的美感，全规范汉字偏旁部首，如同书写。你可以享受闭眼创作的乐趣。',
                  gradient: 'from-amber-500 to-orange-500',
                  bg: 'bg-amber-50/50 dark:bg-amber-950/10',
                  border: 'border-amber-200/60 dark:border-amber-800/40',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className={`relative p-7 sm:p-8 rounded-2xl border ${item.bg} ${item.border} hover:shadow-lg transition-all duration-300 group`}
                  >
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold mb-3">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          学习路线
      ======================================== */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="container-page">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">学习路线</h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                五步科学路径，循序渐进，从入门到流畅
              </p>
            </div>

            <div className="relative">
              {/* 连接线 */}
              <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-violet-500 via-blue-500 via-cyan-500 via-teal-500 to-emerald-500 hidden sm:block" />

              <div className="space-y-3">
                {learningSteps.map((step) => (
                  <Link key={step.num} to={step.link} className="block group">
                    <div className="flex items-center gap-5 p-4 sm:p-5 rounded-xl border bg-background hover:border-primary/40 hover:shadow-md transition-all duration-200">
                      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shrink-0 text-white font-bold text-base shadow-md`}>
                        {step.num}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base sm:text-lg group-hover:text-primary transition-colors">
                            {step.title}
                          </h3>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {step.time}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{step.desc}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          页脚 CTA - 情感收尾
      ======================================== */}
      <section className="py-20 sm:py-28">
        <div className="container-page text-center">
          <div className="max-w-xl mx-auto">
            <p className="text-xl sm:text-2xl text-foreground font-medium mb-3 leading-relaxed">
              指尖落下，字便浮现
            </p>
            <p className="text-sm text-muted-foreground mb-10">
              不必纠结读音，不必翻页选字，开始你的形码之旅。
            </p>
            <Link to="/practice">
              <Button size="lg" className="gap-2 px-8 rounded-full text-base">
                <Heart className="h-4 w-4" />
                开始练习
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
