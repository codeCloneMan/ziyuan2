import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Keyboard, BookOpen, Zap, Target, Trophy, ArrowRight, Image, Sparkles, Heart, Star } from 'lucide-react';
import { rootMappings, commonRootMappings } from '@/data/roots';

const features = [
  {
    icon: Keyboard,
    title: '字根练习',
    description: '随机出题，键盘作答，即时反馈。支持随机、顺序、弱项、常用字根四种练习模式。',
    link: '/practice',
  },
  {
    icon: BookOpen,
    title: '字根总表',
    description: '按键盘键位分组展示全部字根映射，一目了然，方便查阅。',
    link: '/table',
  },
  {
    icon: Image,
    title: '字根图',
    description: '查看字源形码 1.31 版完整字根图，直观了解字根在键盘上的分布规律。',
    link: '/chart',
  },
  {
    icon: Zap,
    title: '连击计分',
    description: '连续答对获得连击加成，追踪最高连击记录，学习进度本地保存。',
    link: '/practice',
  },
];

const advantages = [
  {
    icon: Star,
    title: '好学',
    items: [
      '字根安排以字源为主，方便记忆。如：犬、犭、豸、豕、马、牛、羊、虍等同键，记一个记住一串。',
      '主字根安排本身极有规律。如"金木水火土日月"依序放在最下面一排键 ZXCVBNM 上。',
      '识别码用该字拼音，便于人脑直接反应。兼容笔画识别码，生僻字也轻松打。',
      '二根字、三根字绝大多数有三简码，不用刻意记。',
    ],
  },
  {
    icon: Heart,
    title: '好用',
    items: [
      '在 GB2312 中需要选重的字仅 7 个，都是一般情况下用不到的字。',
      '依据人体工程学设计，别扭的指法少，小指用得少，手感非常舒适。',
    ],
  },
  {
    icon: Sparkles,
    title: '优美',
    items: [
      '字根安排本身富有哲理，有一种浑然天成的美感。',
      '不安排怪字根、残字根，字根全是规范的汉字偏旁部首。',
      '拆字简单、直观、有规律。',
      '一级简码无特例，全都在它首根的键位上。',
    ],
  },
];

const keyLayout = [
  { label: '上排 QWERTYUIOP', desc: '地类字根：动物、植物、山、衣、食、住', example: '鱼犬鸟草竹，衣丝山食户' },
  { label: '中排 ASDFGHJKL', desc: '人类字根：人体自身相关', example: '女人手又足，儿身口言无' },
  { label: '下排 ZXCVBNM', desc: '天类字根：五行加日月', example: '金木水火土，日月祭今古' },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-20 md:py-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-72 w-72 rounded-full bg-amber-200/30 dark:bg-amber-500/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 sm:px-4 py-1.5 text-xs sm:text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            字源形码 · 字根记忆训练
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            刻意练习
            <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
              ，你也可以是记忆高手
            </span>
          </h1>
          <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground">
            字源形码——以字源为主安排字根，好学、好用、优美。通过科学的记忆训练程序，
            极大提高字根记忆效率，助你快速掌握全部字根映射。
          </p>
          <div className="mt-6 sm:mt-10 flex items-center justify-center gap-3 sm:gap-4">
            <Link to="/practice">
              <Button size="lg" className="gap-2 bg-primary px-6 sm:px-8 text-sm sm:text-base text-primary-foreground hover:bg-primary/90">
                <Keyboard className="h-4 w-4 sm:h-5 sm:w-5" />
                开始练习
              </Button>
            </Link>
            <Link to="/chart">
              <Button size="lg" variant="outline" className="gap-2 px-6 sm:px-8 text-sm sm:text-base border-border text-foreground hover:bg-accent/10">
                <Image className="h-4 w-4 sm:h-5 sm:w-5" />
                查看字根图
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 介绍 */}
      <section className="border-y border-border bg-card/60 py-12 sm:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-8 sm:mb-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">什么是字源形码？</h2>
            <p className="mt-2 sm:mt-3 text-muted-foreground">一款以字源为灵魂的 26 键形码输入法</p>
          </div>
          <div className="mb-8 sm:mb-12 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-amber-500/5 p-5 sm:p-8">
            <p className="text-base sm:text-lg leading-relaxed text-foreground/80">
              字源形码是一种全新的 26 键形码输入方案。汉字以<strong>（字根 + 全拼）</strong>出字，至多四码，
              其中拼音可以大体上看做是 86 五笔的识别码。有些难读的字，可以<strong>（字根 + 笔画）</strong>打出。
              字根安排以字源为主，同源字根归并后，大部分形近字根位于同一按键，易记忆；字根大，拆分简单，并且重码低。
            </p>
          </div>
          <div className="grid gap-4 sm:gap-8 md:grid-cols-3">
            {advantages.map((adv) => {
              const Icon = adv.icon;
              return (
                <Card key={adv.title} className="border-border bg-card/80">
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <CardTitle className="text-lg sm:text-xl text-foreground">第{advantages.indexOf(adv) + 1}：{adv.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {adv.items.map((item, idx) => (
                        <li key={idx} className="flex gap-2 text-xs sm:text-sm text-muted-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 键位分布 */}
      <section className="py-12 sm:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-8 sm:mb-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">键位分布规律</h2>
            <p className="mt-2 sm:mt-3 text-muted-foreground">天地人三排，字源有哲理</p>
          </div>
          <div className="space-y-4 sm:space-y-6">
            {keyLayout.map((row) => (
              <div key={row.label} className="flex flex-col items-center gap-3 sm:gap-4 rounded-2xl border border-border bg-card/80 p-4 sm:p-6 md:flex-row md:items-start">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-base sm:text-lg font-bold text-primary-foreground">
                  {row.label.charAt(0)}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">{row.label}</h3>
                  <p className="mt-1 text-muted-foreground text-sm sm:text-base">{row.desc}</p>
                  <p className="mt-2 font-medium text-amber-600 dark:text-amber-400 text-sm sm:text-base">口诀：{row.example}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 sm:mt-8 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 sm:p-6 text-center">
            <p className="text-amber-800 dark:text-amber-200 text-sm sm:text-base">
              <strong>V 型结构：</strong>横折点撇竖，分别对应 <code className="rounded bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 text-amber-900 dark:text-amber-100">Q D V M L</code> 五个键位
            </p>
            <p className="mt-2 text-xs sm:text-sm text-amber-600 dark:text-amber-400">
              "一二三四五六七八九十"安排在最上面一排键；"丨丿丶乚"分别安排在 LMVD 上，皆取象形
            </p>
          </div>
        </div>
      </section>

      {/* 取码规则 */}
      <section className="border-t border-border bg-card/60 py-12 sm:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-8 sm:mb-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">取码规则</h2>
            <p className="mt-2 sm:mt-3 text-muted-foreground">字根 + 拼音，至多四码</p>
          </div>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: '一字根', rule: '字根 + 全拼 + 全拼 + 全拼', example: '石 → f + shi → fshi' },
              { title: '二字根', rule: '字根 + 字根 + 全拼', example: '对 → ff + d → ffd' },
              { title: '三字根', rule: '字根 + 字根 + 字根 + 声母', example: '以 → dvs + y → dvsy' },
              { title: '四字根', rule: '字根 + 字根 + 字根 + 字根', example: '您 → saij' },
              { title: '超四字根', rule: '字根 + 字根 + 字根 + 末根', example: '御 → gtqj' },
              { title: '生僻字', rule: '字根 + 笔画识别', example: '夻 → skq（大+口+一）' },
            ].map((item) => (
              <Card key={item.title} className="border-border bg-card/80">
                <CardHeader className="pb-2 p-3 sm:p-6">
                  <CardTitle className="text-sm sm:text-base text-foreground">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{item.rule}</p>
                  <p className="mt-1.5 sm:mt-2 text-xs text-muted-foreground/70">例：{item.example}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 功能特性 */}
      <section className="py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-8 sm:mb-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">练习功能</h2>
            <p className="mt-2 sm:mt-3 text-muted-foreground">专为字根记忆设计的训练系统</p>
          </div>
          <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="group border-border bg-card/80 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader className="p-3 sm:p-6">
                    <div className="mb-2 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <CardTitle className="text-sm sm:text-base text-foreground">{feature.title}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground">{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                    <Link to={feature.link}>
                      <Button variant="ghost" className="gap-1 text-xs sm:text-sm text-primary hover:text-primary/80 p-0 h-auto">
                        了解更多
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-gradient-to-br from-primary/5 to-amber-500/5 py-12 sm:py-20">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <Trophy className="mx-auto mb-3 sm:mb-4 h-10 w-10 sm:h-12 sm:w-12 text-amber-500" />
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">准备好了吗？</h2>
          <p className="mt-3 sm:mt-4 text-muted-foreground text-sm sm:text-base">
            现在就开始字根练习，掌握字根映射，享受字源形码打字带来的快感！
          </p>
          <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3 sm:gap-4">
            <Link to="/practice">
              <Button size="lg" className="gap-2 bg-primary px-8 sm:px-10 text-sm sm:text-base text-primary-foreground hover:bg-primary/90">
                <Keyboard className="h-4 w-4 sm:h-5 sm:w-5" />
                开始练习
              </Button>
            </Link>
            <Link to="/chart">
              <Button size="lg" variant="outline" className="gap-2 px-8 sm:px-10 text-sm sm:text-base border-border text-foreground hover:bg-accent/10">
                <Image className="h-4 w-4 sm:h-5 sm:w-5" />
                查看字根图
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
