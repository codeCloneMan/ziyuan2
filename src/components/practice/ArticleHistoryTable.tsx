/**
 * 跟打历史成绩表（genda「历史样式」口径）：段号、速度、击键、码长、
 * 字数、回改、错字、用时、键准、结果；支持复制 TSV 与清除。
 */

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { recordsToTSV, type SegmentRecord } from '@/lib/article-history';
import { ClipboardCopy, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface ArticleHistoryTableProps {
  records: readonly SegmentRecord[];
  onClear: () => void;
  /** 默认是否展开 */
  defaultOpen?: boolean;
}

export function ArticleHistoryTable({ records, onClear, defaultOpen = true }: ArticleHistoryTableProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(recordsToTSV(records));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* 剪贴板不可用忽略 */ }
  };

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 text-sm font-semibold text-muted-foreground font-serif mb-2 hover:text-foreground transition-colors"
      >
        跟打历史
        <span className="text-xs font-normal">（{records.length} 段成绩）</span>
        <span className="ml-auto flex items-center gap-1 text-[11px] font-normal">
          {open ? '收起' : '展开'}
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>
      {open && (
        <>
          {records.length === 0 ? (
            <p className="text-xs text-muted-foreground/70 py-3 text-center border border-dashed border-border/60 rounded-xl">
              还没有成绩 · 每打完一段自动记一条
            </p>
          ) : (
            <div className="max-h-64 overflow-auto rounded-xl border border-border/50">
              <table className="w-full text-[11px] whitespace-nowrap">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr className="text-muted-foreground">
                    {['时间', '文章', '段', '速度', '击键', '码长', '字数', '回改', '错字', '准度', '键准', '用时', '结果'].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...records].reverse().map(r => (
                    <tr key={r.t} className="border-t border-border/30 font-mono-stat">
                      <td className="px-2 py-1.5">{new Date(r.t).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-2 py-1.5 max-w-24 truncate" title={r.title}>{r.title}</td>
                      <td className="px-2 py-1.5">{r.seg}/{r.segTotal}</td>
                      <td className="px-2 py-1.5 font-semibold">{r.speed}</td>
                      <td className="px-2 py-1.5">{r.kps.toFixed(2)}</td>
                      <td className="px-2 py-1.5">{r.avgLen.toFixed(2)}</td>
                      <td className="px-2 py-1.5">{r.chars}</td>
                      <td className="px-2 py-1.5">{r.undo}</td>
                      <td className="px-2 py-1.5 text-red-500">{r.wrong}</td>
                      <td className="px-2 py-1.5">{r.acc}%</td>
                      <td className="px-2 py-1.5">{r.keyAcc}%</td>
                      <td className="px-2 py-1.5">{(r.ms / 1000).toFixed(1)}s</td>
                      <td className={cn('px-2 py-1.5 font-medium', r.pass ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
                        {r.pass ? '达标' : '未达标'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={copy} disabled={records.length === 0}>
              <ClipboardCopy className="h-3.5 w-3.5" />{copied ? '已复制' : '复制成绩'}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-red-400 hover:text-red-600" onClick={onClear} disabled={records.length === 0}>
              <Trash2 className="h-3.5 w-3.5" />清除历史
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
