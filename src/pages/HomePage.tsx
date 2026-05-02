import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Keyboard, BookOpen, Zap, Target, Trophy, ArrowRight, Image,
  Sparkles, Heart, Star, TrendingUp, Brain, Clock, Award,
  CheckCircle2, ArrowUpRight, Activity, GraduationCap,
  Monitor, Apple, Smartphone, Download
} from 'lucide-react';
import { practiceRootMappings, commonRootMappings } from '@/data/roots';

const features = [
  {
    icon: Keyboard,
    title: '字根练习',
    description: '随机出题，即时反馈，智能追踪薄弱项',
    link: '/practice',
    stats: '4种模式'
  },
  {
    icon: BookOpen,
    title: '字根总表',
    description: '按键位分组，241个字根一目了然',
    link: '/table',
    stats: '241字根'
  },
  {
    icon: Image,
    title: '字根图',
    description: 'v1.31版完整键位分布图，直观掌握规律',
    link: '/chart',
    stats: 'v1.31版'
  },
  {
    icon: Trophy,
    title: '码表测评',
    description: '上传码表，32项专业指标全面分析',
    link: '/evaluate',
    stats: '32指标'
  },
];

const advantages = [
  { icon: Star, title: '好学', desc: '字源为主，记一串' },
  { icon: Heart, title: '好用', desc: '选重仅7字' },
  { icon: Sparkles, title: '优美', desc: '浑然天成' },
];

const stats = [
  { value: '241', label: '字根总数', suffix: '' },
  { value: '2.8', label: '平均码长', suffix: '' },
  { value: '7', label: 'GB2312选重', suffix: '字' },
  { value: '2-7', label: '学习周期', suffix: '天' },
];

const steps = [
  { num: '01', title: '认识字根', desc: '查看字根总表，了解241个字根的分布规律', time: '20分钟', link: '/table', icon: BookOpen },
  { num: '02', title: '记忆字根', desc: '科学渐进式练习，逐步掌握全部字根', time: '1-2天', link: '/practice', icon: Brain },
  { num: '03', title: '练习巩固', desc: '通过错题回顾和反复练习巩固记忆', time: '2-3天', link: '/practice', icon: Target },
  { num: '04', title: '整字输入', desc: '从字根到整字，练习汉字编码拆分', time: '3-5天', link: '/whole-char', icon: Keyboard },
  { num: '05', title: '实战打字', desc: '安装输入法，在实际打字中流畅运用', time: '持续练习', link: '/faq', icon: Zap },
];

export default function HomePage() {
  // 从localStorage读取学习进度数据
  const getLearningStats = () => {
    try {
      const stored = localStorage.getItem('ziyuan-root-learning');
      if (stored) {
        const pool = JSON.parse(stored);
        return {
          mastered: pool.masteredPool?.length || 0,
          active: pool.activePool?.length || 0,
          pending: pool.pendingPool?.length || 0,
          total: practiceRootMappings.length,
        };
      }
    } catch { /* 忽略解析错误 */ }
    return { mastered: 0, active: 0, pending: practiceRootMappings.length, total: practiceRootMappings.length };
  };

  const getPracticeDays = () => {
    try {
      const stored = localStorage.getItem('ziyuan-root-learning');
      if (stored) {
        const pool = JSON.parse(stored);
        const items = pool.items || {};
        const times = Object.values(items).map((item: any) => item.lastPracticeTime || 0).filter(t => t > 0);
        if (times.length === 0) return 0;
        const firstTime = Math.min(...times);
        const days = Math.ceil((Date.now() - firstTime) / (1000 * 60 * 60 * 24));
        return Math.max(1, days);
      }
    } catch { /* 忽略解析错误 */ }
    return 0;
  };

  const learningStats = getLearningStats();
  const practiceDays = getPracticeDays();
  const progressPercent = learningStats.total > 0 ? Math.round((learningStats.mastered / learningStats.total) * 100) : 0;

  // 艾宾浩斯遗忘曲线数据点
  const forgettingCurvePoints = useMemo(() => {
    const points: { day: number; retention: number }[] = [];
    for (let d = 0; d <= 30; d += 0.5) {
      // R = e^(-t/S)，S为记忆稳定性系数
      const retention = Math.exp(-d / 3.5) * 100;
      points.push({ day: d, retention: Math.max(retention, 5) });
    }
    return points;
  }, []);

  // 复习加强后的曲线数据
  const reviewCurvePoints = useMemo(() => {
    const points: { day: number; retention: number }[] = [];
    // 模拟经过3次复习后的记忆曲线
    const reviewIntervals = [1, 3, 7]; // 复习间隔（天）
    for (let d = 0; d <= 30; d += 0.5) {
      let stability = 3.5;
      for (const interval of reviewIntervals) {
        if (d > interval) {
          stability *= 1.8; // 每次复习增强记忆稳定性
        }
      }
      const retention = Math.exp(-d / stability) * 100;
      points.push({ day: d, retention: Math.max(retention, 5) });
    }
    return points;
  }, []);

  // SVG图表尺寸
  const chartWidth = 400;
  const chartHeight = 200;
  const chartPadding = { top: 20, right: 20, bottom: 30, left: 40 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  const toSvgX = (day: number) => chartPadding.left + (day / 30) * plotWidth;
  const toSvgY = (retention: number) => chartPadding.top + plotHeight - (retention / 100) * plotHeight;

  const curvePath = forgettingCurvePoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'}${toSvgX(p.day).toFixed(1)},${toSvgY(p.retention).toFixed(1)}`
  ).join(' ');

  const reviewPath = reviewCurvePoints.map((p, i) => 
    `${i === 0 ? 'M' : 'L'}${toSvgX(p.day).toFixed(1)},${toSvgY(p.retention).toFixed(1)}`
  ).join(' ');

  return (
    <div className="min-h-screen">
      {/* ========================================
          Hero Section - 核心价值主张
      ======================================== */}
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
        {/* 背景装饰 */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="absolute left-1/4 top-1/3 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute right-1/4 bottom-1/3 w-[400px] h-[400px] rounded-full bg-accent/8 blur-[100px]" />
        </div>

        <div className="container-page relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* 徽章 */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-secondary/80 px-4 py-2 text-sm text-muted-foreground mb-6 animate-fadeIn backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-accent" />
              字源形码 · 专业字根记忆训练平台
            </div>

            {/* 主标题 */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6 animate-slideInUp">
              如同纸上书写
              <br />
              <span className="bg-gradient-to-r from-primary via-emerald-500 to-primary bg-clip-text text-transparent bg-[size:200%_auto] animate-[gradient-x_3s_ease-in-out_infinite]">
                自由打字
              </span>
            </h1>

            {/* 副标题 */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed animate-fadeIn" style={{ animationDelay: '0.1s' }}>
              字源形码，让每一个汉字的输入都回归本源。
            </p>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fadeIn" style={{ animationDelay: '0.15s' }}>
              不再是生硬的编码记忆，而是沿着<strong className="text-foreground">字源之理</strong>，
              自然而然地<strong className="text-foreground">记住一串</strong>。
              当你的指尖在键盘上流淌，汉字便如泉涌而出——
              <strong className="text-foreground">好学</strong>、
              <strong className="text-foreground">好用</strong>、
              <strong className="text-foreground">优美</strong>，
              这是属于中文的输入哲学。
            </p>

            {/* CTA按钮组 */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
              <Link to="/practice">
                <Button size="lg" className="btn-primary text-base gap-2 px-8 py-3">
                  <Keyboard className="h-5 w-5" />
                  立即开始练习
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              
              <Link to="/chart">
                <Button size="lg" variant="outline" className="btn-secondary text-base gap-2 px-8 py-3">
                  <Image className="h-5 w-5" />
                  查看字根图
                </Button>
              </Link>
            </div>

            {/* 快速数据展示 */}
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 max-w-3xl mx-auto animate-fadeIn" style={{ animationDelay: '0.3s' }}>
              {stats.map((stat) => (
                <div key={stat.label} className="text-center group">
                  <div className="text-3xl sm:text-4xl font-bold text-foreground group-hover:text-primary transition-colors number-animate">
                    {stat.value}
                    <span className="text-lg text-muted-foreground ml-1">{stat.suffix}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          记忆曲线可视化 - 艾宾浩斯遗忘曲线
      ======================================== */}
      <section className="section bg-muted/30">
        <div className="container-page">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">科学记忆，事半功倍</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              基于艾宾浩斯遗忘曲线，科学安排复习节奏
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* 遗忘曲线图 */}
            <div className="card-base">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">艾宾浩斯遗忘曲线</h3>
              </div>
              
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto" aria-label="遗忘曲线图">
                {/* 背景网格 */}
                {[0, 25, 50, 75, 100].map(y => (
                  <line key={y} x1={chartPadding.left} y1={toSvgY(y)} x2={chartWidth - chartPadding.right} y2={toSvgY(y)} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
                ))}
                {[0, 5, 10, 15, 20, 25, 30].map(x => (
                  <line key={x} x1={toSvgX(x)} y1={chartPadding.top} x2={toSvgX(x)} y2={chartHeight - chartPadding.bottom} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
                ))}

                {/* Y轴标签 */}
                {[0, 50, 100].map(y => (
                  <text key={y} x={chartPadding.left - 8} y={toSvgY(y) + 4} textAnchor="end" className="text-[10px] fill-muted-foreground">{y}%</text>
                ))}

                {/* X轴标签 */}
                {[0, 10, 20, 30].map(x => (
                  <text key={x} x={toSvgX(x)} y={chartHeight - chartPadding.bottom + 18} textAnchor="middle" className="text-[10px] fill-muted-foreground">{x}天</text>
                ))}

                {/* 无复习曲线 - 填充区域 */}
                <path d={`${curvePath} L${toSvgX(30)},${toSvgY(0)} L${toSvgX(0)},${toSvgY(0)} Z`} fill="hsl(var(--destructive))" fillOpacity="0.06" />

                {/* 无复习曲线 */}
                <path d={curvePath} fill="none" stroke="hsl(var(--destructive))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" />

                {/* 科学复习曲线 - 填充区域 */}
                <path d={`${reviewPath} L${toSvgX(30)},${toSvgY(0)} L${toSvgX(0)},${toSvgY(0)} Z`} fill="hsl(var(--primary))" fillOpacity="0.08" />

                {/* 科学复习曲线 */}
                <path d={reviewPath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* 复习时间点标记 */}
                {[1, 3, 7].map((day, i) => {
                  const point = reviewCurvePoints.find(p => Math.abs(p.day - day) < 0.3);
                  if (!point) return null;
                  return (
                    <g key={day}>
                      <circle cx={toSvgX(day)} cy={toSvgY(point.retention)} r="4" fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth="2" />
                      <text x={toSvgX(day)} y={toSvgY(point.retention) - 10} textAnchor="middle" className="text-[9px] fill-primary font-bold">
                        第{i + 1}次复习
                      </text>
                    </g>
                  );
                })}

                {/* 图例 */}
                <line x1={chartPadding.left + 10} y1={chartPadding.top + 8} x2={chartPadding.left + 30} y2={chartPadding.top + 8} stroke="hsl(var(--destructive))" strokeWidth="2" strokeDasharray="6 3" />
                <text x={chartPadding.left + 35} y={chartPadding.top + 12} className="text-[10px] fill-muted-foreground">无复习</text>
                <line x1={chartPadding.left + 90} y1={chartPadding.top + 8} x2={chartPadding.left + 110} y2={chartPadding.top + 8} stroke="hsl(var(--primary))" strokeWidth="2" />
                <text x={chartPadding.left + 115} y={chartPadding.top + 12} className="text-[10px] fill-muted-foreground">科学复习</text>
              </svg>

              <p className="text-sm text-muted-foreground mt-3 text-center">
                第1天、第3天、第7天复习，记忆保持率显著提升
              </p>
            </div>

            {/* 学习进度统计卡片 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">学习进度</h3>
              </div>

              {/* 进度概览 */}
              <div className="card-stats">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">总体掌握度</span>
                  <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
                </div>
                <div className="progress-base mb-4">
                  <div className="progress-bar-animated" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 rounded-lg bg-emerald-500/10">
                    <div className="text-xl font-bold text-emerald-600">{learningStats.mastered}</div>
                    <div className="text-[10px] text-muted-foreground">已掌握</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-amber-500/10">
                    <div className="text-xl font-bold text-amber-600">{learningStats.active}</div>
                    <div className="text-[10px] text-muted-foreground">学习中</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <div className="text-xl font-bold text-muted-foreground">{learningStats.pending}</div>
                    <div className="text-[10px] text-muted-foreground">待学习</div>
                  </div>
                </div>
              </div>

              {/* 练习天数 */}
              <div className="card-base flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">累计练习</div>
                  <div className="text-xl font-bold">
                    {practiceDays > 0 ? `${practiceDays} 天` : '尚未开始'}
                  </div>
                </div>
                {practiceDays === 0 && (
                  <Link to="/practice">
                    <Button className="btn-primary btn-sm">
                      开始练习
                    </Button>
                  </Link>
                )}
              </div>

              {/* 字根统计 */}
              <div className="card-base">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">字根学习进度</span>
                  <span className="text-xs text-muted-foreground">
                    {learningStats.mastered}/{learningStats.total}
                  </span>
                </div>
                <div className="progress-base">
                  <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {progressPercent >= 100 ? '恭喜！你已掌握全部字根 🎉' :
                   progressPercent >= 50 ? '进度过半，继续加油！' :
                   progressPercent > 0 ? '良好的开始是成功的一半' :
                   '万事开头难，从字根练习开始吧'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          特性展示 - 核心功能
      ======================================== */}
      <section className="section-sm bg-muted/30">
        <div className="container-page">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">为什么选择字源形码？</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              三大核心优势，让学习事半功倍
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {advantages.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card-feature stagger-item" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                  
                  {item.title === '好学' && (
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span>字源为主，记一串</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span>五行日月有序排列</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span>识别码用拼音直觉反应</span>
                      </li>
                    </ul>
                  )}
                  
                  {item.title === '好用' && (
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span>GB2312选重仅7字</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span>人体工学设计舒适</span>
                      </li>
                    </ul>
                  )}
                  
                  {item.title === '优美' && (
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span>浑然天成的美感</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span>全规范汉字偏旁部首</span>
                      </li>
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================
          功能模块 - 四大核心功能
      ======================================== */}
      <section className="section">
        <div className="container-page">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold">功能模块</h2>
              <p className="mt-2 text-muted-foreground">全方位的字根学习工具集</p>
            </div>
            <Link to="/practice" className="hidden sm:flex items-center gap-2 text-primary hover:underline font-medium">
              查看全部
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Link key={feature.title} to={feature.link} className="group">
                  <div className="card-interactive h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {feature.stats}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {feature.description}
                    </p>
                    
                    <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      了解更多
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================
          学习路线 - 清晰的引导路径
      ======================================== */}
      <section className="section bg-muted/30">
        <div className="container-page">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">学习路线</h2>
              <p className="text-lg text-muted-foreground">
                5步科学路径，系统掌握字源形码
              </p>
            </div>

            {/* 个人学习进度 */}
            <div className="card-stats mb-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">我的学习进度</span>
                <span className="text-sm font-bold text-primary">{progressPercent}%</span>
              </div>
              <div className="progress-base mb-3">
                <div className="progress-bar-animated" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>已掌握 {learningStats.mastered} 个字根</span>
                <span>目标：{learningStats.total} 个字根</span>
              </div>
            </div>

            <div className="relative">
              {/* 连接线 */}
              <div className="absolute left-8 top-0 bottom-0 w-px bg-border hidden md:block" />

              <div className="space-y-8">
                {steps.map((step, idx) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.num} className="relative flex gap-6 stagger-item" style={{ animationDelay: `${idx * 100}ms` }}>
                      {/* 步骤编号 */}
                      <div className="relative z-10 flex-shrink-0">
                        <div className="w-16 h-16 rounded-full bg-background border-2 border-primary flex items-center justify-center shadow-md">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                      </div>

                      {/* 内容卡片 */}
                      <div className="card-base flex-1 hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="text-xs font-medium text-primary mb-1 block">步骤 {step.num}</span>
                            <h3 className="text-xl font-bold">{step.title}</h3>
                          </div>
                          <span className="text-sm text-muted-foreground flex items-center gap-1 shrink-0">
                            <Clock className="h-4 w-4" />
                            {step.time}
                          </span>
                        </div>
                        <p className="text-muted-foreground mb-3">{step.desc}</p>
                        
                        <Link to={step.link}>
                          <Button className="btn-primary btn-sm">
                            {idx === 0 ? '开始学习' : idx === 1 ? '开始练习' : idx === 2 ? '巩固练习' : idx === 3 ? '整字练习' : '了解更多'}
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          键位布局预览 - 可视化展示
      ======================================== */}
      <section className="section">
        <div className="container-page">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">科学的键位布局</h2>
              <p className="text-lg text-muted-foreground">
                三排键盘，天地人三才，井然有序
              </p>
            </div>

            <div className="space-y-6">
              {/* 上排 - 地类 */}
              <div className="card-base">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <span className="text-lg">🌍</span>
                  </div>
                  <div>
                    <h3 className="font-bold">上排 QWERTYUIOP</h3>
                    <p className="text-sm text-muted-foreground">地类字根：动物、植物、山、衣、食、住</p>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm text-center">
                  鱼犬鸟草竹，衣丝山食户
                </div>
              </div>

              {/* 中排 - 人类 */}
              <div className="card-base">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <span className="text-lg">👤</span>
                  </div>
                  <div>
                    <h3 className="font-bold">中排 ASDFGHJKL</h3>
                    <p className="text-sm text-muted-foreground">人类字根：人体自身相关</p>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm text-center">
                  女人手又足，儿身口言无
                </div>
              </div>

              {/* 下排 - 天类 */}
              <div className="card-base">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <span className="text-lg">☀️</span>
                  </div>
                  <div>
                    <h3 className="font-bold">下排 ZXCVBNM</h3>
                    <p className="text-sm text-muted-foreground">天类字根：五行加日月</p>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm text-center">
                  金木水火土，日月祭今古
                </div>
              </div>
            </div>

            <div className="text-center mt-8">
              <Link to="/table">
                <Button variant="outline" className="btn-secondary gap-2">
                  <BookOpen className="h-4 w-4" />
                  查看完整字根表
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          跨平台支持 - 多平台可用
      ======================================== */}
      <section className="section">
        <div className="container-page">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">全平台支持</h2>
              <p className="text-lg text-muted-foreground">
                无论你使用什么设备，都能流畅使用字源形码
              </p>
            </div>

            {/* 平台图标展示 */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
              {[
                { name: 'Windows', icon: Monitor, desc: 'Windows 7+' },
                { name: 'macOS', icon: Apple, desc: 'macOS 10.14+' },
                { name: 'Linux', icon: Monitor, desc: '主流发行版' },
                { name: 'iOS', icon: Smartphone, desc: 'iOS 14+' },
                { name: 'Android', icon: Smartphone, desc: 'Android 8+' },
              ].map((platform, idx) => {
                const Icon = platform.icon;
                return (
                  <div key={platform.name} className="card-base text-center stagger-item" style={{ animationDelay: `${idx * 80}ms` }}>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-3">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground text-sm mb-1">{platform.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{platform.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* 安装指南 */}
            <div className="card-stats">
              <div className="flex items-center gap-3 mb-4">
                <Download className="h-5 w-5 text-primary" />
                <h3 className="font-bold">快速安装指南</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-background/60 border border-border/40">
                  <h4 className="font-semibold text-sm mb-2">桌面端安装</h4>
                  <ol className="text-sm text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="badge-number shrink-0">1</span>
                      <span>从网盘下载对应平台安装包</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="badge-number shrink-0">2</span>
                      <span>运行安装程序，按提示完成安装</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="badge-number shrink-0">3</span>
                      <span>在输入法设置中启用字源形码</span>
                    </li>
                  </ol>
                  <a
                    href="http://ziyuan.ysepan.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-primary hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    前往下载
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
                <div className="p-4 rounded-xl bg-background/60 border border-border/40">
                  <h4 className="font-semibold text-sm mb-2">移动端安装</h4>
                  <ol className="text-sm text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="badge-number shrink-0">1</span>
                      <span>iOS：通过仓输入等第三方键盘接入</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="badge-number shrink-0">2</span>
                      <span>Android：通过同文输入法等平台加载</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="badge-number shrink-0">3</span>
                      <span>导入字源形码方案即可使用</span>
                    </li>
                  </ol>
                  <Link
                    to="/faq"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-primary hover:underline"
                  >
                    <BookOpen className="h-4 w-4" />
                    查看详细教程
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          CTA区域 - 最终行动召唤
      ======================================== */}
      <section className="section gradient-primary">
        <div className="container-page text-center">
          <div className="max-w-2xl mx-auto text-white">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              准备好开始了吗？
            </h2>
            <p className="text-lg text-white/90 mb-10 leading-relaxed">
              加入数千名学习者的行列，用科学的方法掌握字源形码。
              <br />
              每天30分钟，2-7天即可熟练使用。
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/practice">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 px-8 py-3 text-base font-semibold gap-2 shadow-lg">
                  <Zap className="h-5 w-5" />
                  免费开始练习
                </Button>
              </Link>
              
              <Link to="/evaluate">
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 px-8 py-3 text-base gap-2">
                  <TrendingUp className="h-5 w-5" />
                  测评我的码表
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}