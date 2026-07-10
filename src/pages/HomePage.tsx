import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Keyboard, BookOpen, Zap, ArrowRight, Image,
  ChevronUp, CheckCircle2,
} from 'lucide-react';
import {
  keyboardRows, keyRootsMap,
} from '@/data/roots';
import { useLearningProgress } from '@/hooks/use-learning-progress';

// ============================================
// 学习路线数据
// ============================================

const learningSteps = [
  { num: '壹', title: '认识字根', desc: '查看字根表，了解 329 个字根的分布规律', link: '/table', time: '20 分钟' },
  { num: '贰', title: '记忆字根', desc: '科学渐进式练习，逐步掌握全部字根', link: '/practice', time: '1-2 天' },
  { num: '叁', title: '练习巩固', desc: '通过错题回顾和反复练习巩固记忆', link: '/practice', time: '2-3 天' },
  { num: '肆', title: '整字输入', desc: '从字根到整字，练习汉字编码拆分', link: '/whole-char', time: '3-5 天' },
  { num: '伍', title: '实战打字', desc: '安装输入法，在实际打字中流畅运用', link: '/faq', time: '持续练习' },
];

const quickNav = [
  { label: '字根练习', link: '/practice', icon: Keyboard },
  { label: '字根表', link: '/table', icon: BookOpen },
  { label: '整字练习', link: '/whole-char', icon: Zap },
  { label: '词组练习', link: '/phrase', icon: Image },
];

// ============================================
// 首页组件 - 文化学术风
// ============================================

export default function HomePage() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const { stages, overallProgress, currentStage } = useLearningProgress();

  const handleKeyClick = useCallback((key: string) => {
    setSelectedKey(prev => prev === key ? null : key);
  }, []);

  return (
    <div className="min-h-screen">

      {/* ========================================
          Hero - 文化感首屏
      ======================================== */}
      <section className="relative overflow-hidden">
        {/* 背景装饰 - 柔和渐变 */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent pointer-events-none" />

        <div className="container-page relative pt-20 sm:pt-28 pb-16 sm:pb-20">
          <div className="max-w-3xl mx-auto text-center">
            {/* 主标题 - 宋体 */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-primary leading-[1.15]"
              style={{ fontFamily: "'Noto Serif SC', serif" }}
            >
              字源形码
            </h1>

            {/* 文化副标题 */}
            <p className="text-lg sm:text-xl text-muted-foreground mb-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              字源为基，形码入道
            </p>
            <p className="text-sm text-muted-foreground/60 mb-10">
              字根练习 · 拆字训练 · 进度追踪
            </p>

            {/* 快捷入口 - 更优雅 */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-10">
              {quickNav.map((btn) => {
                const Icon = btn.icon;
                return (
                  <Link key={btn.link} to={btn.link}>
                    <Button
                      variant="outline"
                      size="lg"
                      className="gap-2 rounded-lg px-5 border-border/60 hover:border-primary/30 hover:bg-primary/[0.03] transition-all"
                    >
                      <Icon className="h-4 w-4" />
                      {btn.label}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* 当前阶段 + 整体进度 - 更精致 */}
            {currentStage && (
              <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-card border border-border/60 shadow-sm">
                <div className="flex flex-col items-start">
                  <span className="text-xs text-muted-foreground/70">当前阶段</span>
                  <Link to={currentStage.link} className="font-semibold text-primary hover:underline text-sm" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                    {currentStage.title}
                  </Link>
                </div>
                <div className="h-8 w-px bg-border/50" />
                <div className="flex flex-col items-start min-w-[100px]">
                  <span className="text-xs text-muted-foreground/70">整体进度</span>
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${overallProgress}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono-stat font-bold text-primary">{overallProgress}%</span>
                  </div>
                </div>
                <Link to={currentStage.link}>
                  <Button size="sm" className="gap-1 rounded-lg btn-primary">
                    继续
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================
          学习路线 - 精致时间轴
      ======================================== */}
      <section className="py-14 sm:py-18 bg-muted/20">
        <div className="container-page">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-10 text-center" style={{ fontFamily: "'Noto Serif SC', serif" }}>学习路线</h2>

            <div className="relative">
              {/* 连接线 - 桌面端 */}
              <div className="hidden sm:block absolute top-6 left-0 right-0 h-px bg-border/70" />

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 sm:gap-2">
                {stages.map((stage, idx) => {
                  const stepDef = learningSteps[idx];
                  return (
                    <Link key={stage.id} to={stage.link} className="block group">
                      <div className={`relative flex flex-col items-center text-center p-4 rounded-xl border transition-all duration-200 ${
                        stage.isCompleted
                          ? 'border-emerald-300/50 bg-emerald-50/30 dark:border-emerald-800/50 dark:bg-emerald-950/10'
                          : stage.isActive
                          ? 'border-primary/40 bg-card shadow-sm'
                          : 'border-border/50 bg-card hover:border-primary/20 hover:shadow-sm'
                      }`}>
                        {/* 步骤编号 - 宋体 */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mb-3 text-sm font-bold transition-colors ${
                          stage.isCompleted
                            ? 'bg-emerald-500 text-white'
                            : stage.isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`} style={{ fontFamily: "'Noto Serif SC', serif" }}>
                          {stage.isCompleted ? (
                            <CheckCircle2 className="h-4.5 w-4.5" />
                          ) : (
                            <span>{stepDef?.num || (idx + 1)}</span>
                          )}
                        </div>

                        <h3 className={`font-bold text-sm mb-1 transition-colors ${
                          stage.isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'group-hover:text-primary'
                        }`} style={{ fontFamily: "'Noto Serif SC', serif" }}>
                          {stage.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">{stage.description}</p>

                        {stepDef?.time && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground font-mono-stat">
                            {stepDef.time}
                          </span>
                        )}

                        {/* 进度条 */}
                        {stage.progress > 0 && (
                          <div className="mt-2 w-full">
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                              <span>{stage.isCompleted ? '已完成' : '进行中'}</span>
                              <span className="font-mono-stat">{stage.progress}%</span>
                            </div>
                            <div className="h-1 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${stage.isCompleted ? 'bg-emerald-500' : 'bg-primary'}`}
                                style={{ width: `${stage.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          交互式键盘布局 - 精致键帽
      ======================================== */}
      <section className="py-14 sm:py-18 bg-background">
        <div className="container-page">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>键位分布</h2>
              <p className="text-sm text-muted-foreground/70">
                329 个字根分布在 26 键上——点击按键探索
              </p>
            </div>

            <div className="space-y-1.5 max-w-2xl mx-auto">
              {keyboardRows.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className="flex justify-center gap-1 sm:gap-1.5"
                  style={{ paddingLeft: rowIdx * 10 }}
                >
                  {row.map((key) => {
                    const roots = keyRootsMap[key] || [];
                    const isSelected = selectedKey === key;
                    const firstRoots = roots.slice(0, 3).map(r => r.displayChar).join(' ');
                    return (
                      <button
                        key={key}
                        onClick={() => handleKeyClick(key)}
                        className={`
                          relative w-9 h-11 sm:w-13 sm:h-15 rounded-md
                          flex flex-col items-center justify-center
                          transition-all duration-200 cursor-pointer
                          ${isSelected
                            ? 'border-2 border-primary bg-primary/[0.06] shadow-sm scale-105'
                            : 'border border-border/50 bg-card hover:border-primary/25 hover:shadow-sm hover:-translate-y-0.5'
                          }
                        `}
                      >
                        <span className="text-[11px] sm:text-xs font-bold uppercase text-foreground/80">{key}</span>
                        <span className="text-[7px] sm:text-[9px] text-muted-foreground/70 leading-tight text-center line-clamp-2 root-char">
                          {firstRoots}
                        </span>
                        <span className="absolute -top-1 -right-1 text-[8px] bg-primary/90 text-primary-foreground rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold font-mono-stat">
                          {roots.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* 选中键位详情 - 更精致 */}
            {selectedKey && (
              <div className="mt-6 max-w-2xl mx-auto animate-fadeIn">
                <div className="card-base p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold uppercase">{selectedKey}</span>
                      <span className="text-sm text-muted-foreground">
                        — <span className="font-mono-stat">{keyRootsMap[selectedKey]?.length || 0}</span> 个字根
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedKey(null)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                    {(keyRootsMap[selectedKey] || []).map((root, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-primary/[0.03] transition-colors"
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
