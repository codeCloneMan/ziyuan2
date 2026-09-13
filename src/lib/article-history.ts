/**
 * 跟打历史成绩（genda 口径）：每打完一段（无论是否达标）记一条成绩，
 * 本机持久化；开始页可查看成绩表、复制、清除，按键热图按历史聚合。
 */

export interface SegmentRecord {
  /** 完成时间戳 */
  t: number;
  /** 文章名 */
  title: string;
  /** 段号（1 起）与总段数 */
  seg: number;
  segTotal: number;
  /** 字数（含标点） */
  chars: number;
  /** 总击键（含上屏空格与回删） */
  keys: number;
  /** 用时毫秒 */
  ms: number;
  /** 速度（字/分） */
  speed: number;
  /** 击键（键/秒） */
  kps: number;
  /** 码长（平均每字击键） */
  avgLen: number;
  /** 回改次数 */
  undo: number;
  /** 错字数 */
  wrong: number;
  /** 准度（%） */
  acc: number;
  /** 键准（%）：理想键数 / 实际击键 */
  keyAcc: number;
  /** 是否达到门槛（无门槛时 = true） */
  pass: boolean;
  /** 本段按键分布（键 → 次数），用于热图聚合 */
  keysMap: Record<string, number>;
}

const HISTORY_KEY = 'ziyuan-article-history-v1';
/** 最多保留的成绩条数（避免 localStorage 无限膨胀） */
const MAX_RECORDS = 200;

export function loadHistory(): SegmentRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SegmentRecord[];
    return Array.isArray(arr) ? arr.filter(r => r && typeof r.t === 'number') : [];
  } catch { return []; }
}

export function saveRecord(rec: SegmentRecord): SegmentRecord[] {
  const list = [...loadHistory(), rec].slice(-MAX_RECORDS);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch { /* 超配额忽略 */ }
  return list;
}

export function clearHistory(): void {
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* 忽略 */ }
}

/** 聚合历史成绩里的按键分布（热图数据源） */
export function aggregateKeys(records: readonly SegmentRecord[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) {
    for (const [k, n] of Object.entries(r.keysMap ?? {})) {
      out[k] = (out[k] ?? 0) + n;
    }
  }
  return out;
}

/** 成绩表复制用 TSV（Excel / 跟打器论坛通用） */
export function recordsToTSV(records: readonly SegmentRecord[]): string {
  const head = ['时间', '文章', '段', '速度', '击键', '码长', '字数', '回改', '错字', '准度%', '键准%', '用时s', '结果'];
  const rows = records.map(r => [
    new Date(r.t).toLocaleString(),
    r.title,
    `${r.seg}/${r.segTotal}`,
    r.speed, r.kps.toFixed(2), r.avgLen.toFixed(2),
    r.chars, r.undo, r.wrong, r.acc, r.keyAcc,
    (r.ms / 1000).toFixed(1),
    r.pass ? '达标' : '未达标',
  ].join('\t'));
  return [head.join('\t'), ...rows].join('\n');
}
