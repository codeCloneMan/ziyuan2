import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Search, MessageCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { faqCategories } from '@/data/faqData';

const externalResources = [
  { label: 'QQ群：261418302', href: 'https://qm.qq.com/cgi-bin/qm/qr?authKey=7vCcSmNXkf%2BpzmA5%2BVONkqLIHn5sCZQ%2BB9cju2k5FHuC3zceqm9ex4ZBCGeA6ohR&k=Clj6XiPreJ-8u0IO6TTg6QcTCJc_Rq_k&noverify=0', icon: MessageCircle },
  { label: '网盘下载', href: 'http://ziyuan.ysepan.com/', icon: ExternalLink },
  { label: '宇浩测码', href: 'https://ceping.shurufa.app/', icon: ExternalLink },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');


  const filteredFaqs = searchQuery.trim()
    ? faqCategories.map((cat) => ({
        ...cat,
        faqs: cat.faqs.filter(
          (faq) =>
            faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.a.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((cat) => cat.faqs.length > 0)
    : faqCategories;

  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 py-8 sm:py-12">
      {/* 标题 */}
      <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">常见问题</h1>
        <p className="mt-2 sm:mt-3 text-muted-foreground">
          快速找到你需要的答案
        </p>
      </div>

      {/* 搜索栏 */}
      <div className="mx-auto mb-6 sm:mb-8 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索问题..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-border pl-10 focus:border-primary"
          />
        </div>
      </div>

      {/* FAQ 分类 */}
      <div className="space-y-6">
        {filteredFaqs.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.name} className="border-border bg-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-foreground">
                  <Icon className="h-5 w-5 text-primary" />
                  {category.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {category.faqs.map((faq, idx) => (
                    <AccordionItem key={idx} value={`item-${idx}`} className="border-b border-border last:border-0">
                      <AccordionTrigger className="text-left text-sm sm:text-base text-foreground hover:text-primary py-3 sm:py-4">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm sm:text-base text-muted-foreground pb-3 sm:pb-4">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredFaqs.length === 0 && (
        <div className="py-12 sm:py-16 text-center text-muted-foreground">
          <HelpCircle className="mx-auto mb-4 h-10 w-10 sm:h-12 sm:w-12" />
          <p>没有找到相关问题</p>
          <p className="mt-2 text-sm">试试其他关键词，或加入QQ群询问</p>
        </div>
      )}

      {/* 联系我们 */}
      <Card className="mt-8 sm:mt-10 border-border bg-card/80">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg text-foreground">还需要帮助？</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {externalResources.map((resource) => {
              const Icon = resource.icon;
              return (
                <a
                  key={resource.label}
                  href={resource.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 sm:px-4 py-2 text-xs sm:text-sm text-muted-foreground hover:bg-accent/10 hover:text-foreground transition-colors"
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {resource.label}
                </a>
              );
            })}
          </div>
          <div className="mt-4 text-xs sm:text-sm text-muted-foreground">
            欢迎加入字源形码大家庭，一起探索汉字之美！
          </div>
        </CardContent>
      </Card>
    </div>
  );
}