import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Search, MessageCircle, HelpCircle, ExternalLink } from 'lucide-react';
import { faqCategories } from '@/data/faqData';

const externalResources = [
  { label: 'QQ群：261418302', href: 'https://qm.qq.com/cgi-bin/qm/qr?authKey=7vCcSmNXkf%2BpzmA5%2BVONkqLIHn5sCZQ%2BB9cju2k5FHuC3zceqm9ex4ZBCGeA6ohR&k=Clj6XiPreJ-8u0IO6TTg6QcTCJc_Rq_k&noverify=0', icon: MessageCircle },
  { label: '网盘下载', href: 'https://ziyuan.ysepan.com/', icon: ExternalLink },
  { label: '宇浩测码', href: 'https://ceping.shurufa.app/', icon: ExternalLink },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');


  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqCategories;
    const query = searchQuery.toLowerCase();
    return faqCategories.map((cat) => ({
      ...cat,
      faqs: cat.faqs.filter(
        (faq) =>
          faq.q.toLowerCase().includes(query) ||
          faq.a.toLowerCase().includes(query)
      ),
    })).filter((cat) => cat.faqs.length > 0);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero区 */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        <div className="container-page text-center max-w-4xl">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium">
            <MessageCircle className="h-4 w-4 mr-1.5" />
            帮助中心
          </Badge>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 animate-slideInUp">
            常见
            <span className="text-gradient-primary"> 问题</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            快速找到你需要的答案，解决学习中的疑惑
          </p>
        </div>
      </section>

      {/* 搜索栏 */}
      <section className="pb-8 -mt-6">
        <div className="container-page max-w-2xl">
          <div className="input-search mx-auto">
            <Search className="icon" />
            <input
              type="text"
              placeholder="搜索问题..."
              aria-label="搜索常见问题"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* 外部资源链接 */}
      {searchQuery.trim() === '' && (
        <section className="pb-8 sm:pb-12">
          <div className="container-page max-w-2xl">
            <div className="card-base p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                更多资源
              </h3>
              
              <div className="grid gap-3 sm:grid-cols-3">
                {externalResources.map((resource) => {
                  const Icon = resource.icon;
                  return (
                    <a
                      key={resource.label}
                      href={resource.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card-interactive flex items-center justify-center gap-2 py-3"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{resource.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQ 分类 */}
      <section className="pb-16 sm:pb-20">
        <div className="container-page max-w-4xl">
        {filteredFaqs.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.name} className="card-base mb-6 stagger-item">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground">{category.name}</h2>
              </div>

              <Accordion type="single" collapsible className="w-full pt-2">
                {category.faqs.map((faq, idx) => (
                  <AccordionItem key={idx} value={`item-${idx}`} className="border-b border-border last:border-0">
                    <AccordionTrigger className="text-left text-sm sm:text-base text-foreground hover:text-primary py-3 sm:py-4">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm sm:text-base text-muted-foreground pb-3 sm:pb-4 leading-relaxed">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          );
        })}
        </div>
      </section>

      {filteredFaqs.length === 0 && (
        <section className="pb-16">
          <div className="container-page max-w-md">
            <div className="empty-state">
              <HelpCircle className="empty-state-icon" />
              <h3 className="empty-state-title">没有找到相关问题</h3>
              <p className="empty-state-desc">试试其他关键词，或加入QQ群询问</p>
            </div>
          </div>
        </section>
      )}

      {/* 联系我们 */}
      <section className="pb-20 bg-muted/30">
        <div className="container-page max-w-2xl">
          <div className="card-stats text-center">
            <h3 className="font-bold text-xl mb-6">还需要帮助？</h3>
            
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {externalResources.map((resource) => {
                const Icon = resource.icon;
                return (
                  <a
                    key={resource.label}
                    href={resource.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary inline-flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {resource.label}
                  </a>
                );
              })}
            </div>
            
            <p className="text-sm text-muted-foreground">
              欢迎加入字源形码大家庭，一起探索汉字之美！
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}