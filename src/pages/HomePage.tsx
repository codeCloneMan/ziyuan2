import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Keyboard, BookOpen, PenTool, TextQuote, ArrowRight,
  ChevronUp, CheckCircle2, Sparkles,
} from 'lucide-react';
import {
  keyboardRows, keyRootsMap, practiceRootMappings,
} from '@/data/roots';
import { useLearningProgress } from '@/hooks/use-learning-progress';
import { cn } from '@/lib/utils';

// ============================================
// 学习路线数据
// ============================================

const learningSteps = [
  { num: '壹', title: '认识字根', desc: '了解字根分布规律', link: '/table', time: '20 分钟' },
  { num: '贰', title: '记忆字根', desc: '科学渐进式练习', link: '/practice', time: '1-2 天' },
  { num: '叁', title: '练习巩固', desc: '错题回顾反复练', link: '/practice', time: '2-3 天' },
  { num: '肆', title: '整字输入', desc: '汉字编码拆分', link: '/whole-char', time: '3-5 天' },
  { num: '伍', title: '实战打字', desc: '安装输入法实战', link: '/faq', time: '持续练习' },
];

const practiceEntries = [
  { label: '字根练习', desc: '看根识键', link: '/practice', icon: Keyboard },
  { label: '整字练习', desc: '拆字编码', link: '/whole-char', icon: PenTool },
  { label: '词组练习', desc: '四码上屏', link: '/phrase', icon: TextQuote },
  { label: '字根表', desc: '按键检索', link: '/table', icon: BookOpen },
];

// 整体进度环
function ProgressRing({ value, size = 96 }: { value: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * value) / 100}
          className="stroke-primary transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-mono-stat text-primary">{value}%</span>
      </div>
    </div>
  );
}

// ============================================
// 首页 - 文枢·新中式 bento
// ============================================

export default function HomePage() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const { stages, overallProgress, currentStage } = useLearningProgress();

  const handleKeyClick = useCallback((key: string) => {
    setSelectedKey(prev => prev === key ? null : key);
  }, []);

  return (
    <div className="min-h-screen bg-mesh">

      {/* ========================================
          Hero - 大标题 + 双 CTA
      ======================================== */}
      <section className="relative overflow-hidden">
        <div className="container-page relative pt-16 sm:pt-24 pb-12 sm:pb-16">
          <div className="max-w-3xl mx-auto text-center">
            {/* 眉题章 */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/[0.05] text-primary text-xs font-medium mb-6">
              <Sparkles className="h-3 w-3" />
              字源 1.32 版字根 · 艾宾浩斯记忆
            </div>

            {/* 主标题 */}
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.15] mb-4">
              <span className="text-foreground">字源</span><span className="text-gradient-primary">形码</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mb-2 font-serif">
              字源为基，形码入道
            </p>
            <p className="text-sm text-muted-foreground/60 mb-8">
              字根练习 · 拆字训练 · 进度追踪
            </p>

            {/* CTA */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <Link to="/practice">
                <span className="btn-primary px-7 py-3 text-base gap-2 shadow-md shadow-primary/20">
                  开始练习
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
              <Link to="/table">
                <span className="btn-secondary px-6 py-3 text-base">
                  <BookOpen className="h-4 w-4" />
                  字根表
                </span>
              </Link>
            </div>

            <p className="text-xs text-muted-foreground/50 font-mono-stat tracking-wide">
              {practiceRootMappings.length} 字根 · 26 键位 · 4 种练习模式
            </p>
          </div>
        </div>
      </section>

      {/* ========================================
          Bento 网格
      ======================================== */}
      <section className="container-page pb-16 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 sm:gap-5 max-w-6xl mx-auto">

          {/* 瓦片 1: 整体进度（进度环 + 继续） */}
          <div className="lg:col-span-2 card-base !rounded-2xl p-6 flex flex-col">
            <h2 className="text-sm font-semibold text-muted-foreground mb-5 font-serif">学习进度</h2>
            <div className="flex items-center gap-5">
              <ProgressRing value={overallProgress} />
              <div className="min-w-0">
                {currentStage ? (
                  <>
                    <div className="text-xs text-muted-foreground/70 mb-0.5">当前阶段</div>
                    <Link to={currentStage.link} className="font-serif font-bold text-foreground hover:text-primary transition-colors">
                      {currentStage.title}
                    </Link>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">从第一步开始</div>
                )}
              </div>
            </div>
            {currentStage && (
              <Link to={currentStage.link} className="mt-5">
                <span className="btn-primary w-full gap-1.5 py-2.5">
                  继续
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            )}
          </div>

          {/* 瓦片 2: 学习路线（横向五步） */}
          <div className="lg:col-span-4 card-base !rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-5 font-serif">学习路线</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {stages.map((stage, idx) => {
                const stepDef = learningSteps[idx];
                return (
                  <Link key={stage.id} to={stage.link} className="group">
                    <div className={cn(
                      'relative h-full flex flex-col items-center text-center p-3 rounded-xl border transition-all duration-300',
                      stage.isCompleted
                        ? 'border-emerald-300/60 bg-emerald-50/40 dark:border-emerald-800/50 dark:bg-emerald-950/15'
                        : stage.isActive
                        ? 'border-primary/35 bg-primary/[0.04] shadow-sm'
                        : 'border-border/50 hover:border-primary/20 hover:-translate-y-0.5 hover:shadow-sm'
                    )}>
                      {stage.isActive && (
                        <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-px rounded-full bg-primary text-primary-foreground text-[9px] font-medium whitespace-nowrap">
                          进行中
                        </span>
                      )}
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center mb-2 text-sm font-bold font-serif transition-colors',
                        stage.isCompleted
                          ? 'bg-emerald-500 text-white'
                          : stage.isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                      )}>
                        {stage.isCompleted ? <CheckCircle2 className="h-4 w-4" /> : stepDef?.num}
                      </div>
                      <div className={cn(
                        'text-xs font-bold mb-0.5 font-serif',
                        stage.isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
                      )}>
                        {stage.title}
                      </div>
                      <div className="text-[10px] text-muted-foreground/70 leading-snug mb-1.5">{stepDef?.time}</div>
                      {stage.progress > 0 && (
                        <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', stage.isCompleted ? 'bg-emerald-500' : 'bg-primary')}
                            style={{ width: `${stage.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 瓦片 3: 快捷入口 */}
          <div className="lg:col-span-2 card-base !rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-5 font-serif">练习入口</h2>
            <div className="space-y-1.5">
              {practiceEntries.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.link + item.label} to={item.link} className="group flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 hover:bg-primary/[0.04]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.07] text-primary transition-all duration-200 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{item.label}</div>
                      <div className="text-xs text-muted-foreground/70">{item.desc}</div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 瓦片 4: 键位分布（交互键盘，全宽） */}
          <div className="lg:col-span-6 card-base !rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
              <div>
                <h2 className="text-lg font-bold font-serif mb-1">键位分布</h2>
                <p className="text-sm text-muted-foreground/70">
                  {practiceRootMappings.length} 个字根分布在 26 键上——点击按键探索
                </p>
              </div>
              {selectedKey && (
                <button
                  onClick={() => setSelectedKey(null)}
                  className="self-start sm:self-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <ChevronUp className="h-3 w-3" />
                  收起 {selectedKey.toUpperCase()}
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-w-2xl mx-auto overflow-x-auto pb-1">
              {keyboardRows.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className="flex justify-center gap-1 sm:gap-1.5 min-w-max sm:min-w-0 px-2 sm:px-0"
                  style={{ paddingLeft: `clamp(0px, ${rowIdx * 1.2}rem, ${rowIdx * 1.2}rem)` }}
                >
                  {row.map((key) => {
                    const roots = keyRootsMap[key] || [];
                    const isSelected = selectedKey === key;
                    const firstRoots = roots.slice(0, 3).map(r => r.displayChar).join(' ');
                    return (
                      <button
                        key={key}
                        onClick={() => handleKeyClick(key)}
                        className={cn(
                          'relative w-9 h-11 sm:w-13 sm:h-15 rounded-lg',
                          'flex flex-col items-center justify-center',
                          'transition-all duration-200 cursor-pointer',
                          isSelected
                            ? 'border-2 border-primary bg-primary/[0.07] shadow-sm scale-105 z-10'
                            : 'border border-border/60 bg-card shadow-[inset_0_-2px_0_0px_hsl(var(--border)/0.6)] hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-sm'
                        )}
                      >
                        <span className="text-[11px] sm:text-xs font-bold uppercase text-foreground/80">{key}</span>
                        <span className="text-[7px] sm:text-[9px] text-muted-foreground/70 leading-tight text-center line-clamp-2 root-char px-0.5">
                          {firstRoots}
                        </span>
                        <span className="absolute -top-1 -right-1 text-[8px] bg-primary text-primary-foreground rounded-full min-w-3.5 h-3.5 px-0.5 flex items-center justify-center font-bold font-mono-stat shadow-xs">
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
              <div className="mt-6 max-w-2xl mx-auto animate-fade-in">
                <div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold uppercase">{selectedKey}</span>
                    <span className="text-sm text-muted-foreground">
                      <span className="font-mono-stat text-foreground">{keyRootsMap[selectedKey]?.length || 0}</span> 个字根
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                    {(keyRootsMap[selectedKey] || []).map((root, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-1.5 rounded-md hover:bg-primary/[0.05] transition-colors"
                      >
                        <span className="text-lg font-bold root-char">{root.displayChar}</span>
                        <span className="font-mono text-xs text-muted-foreground">{root.key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </section>
    </div>
  );
}
