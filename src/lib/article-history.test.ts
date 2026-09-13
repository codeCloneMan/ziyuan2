import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadHistory, saveRecord, clearHistory, aggregateKeys, recordsToTSV, type SegmentRecord,
} from './article-history';

// node 环境没有 localStorage：挂一个内存桩（与浏览器行为一致的 get/set/remove）
const mem = new Map<string, string>();
const storage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

const rec = (over: Partial<SegmentRecord> = {}): SegmentRecord => ({
  t: 1_700_000_000_000, title: '测试文', seg: 1, segTotal: 3,
  chars: 20, keys: 80, ms: 30_000, speed: 40, kps: 2.67, avgLen: 4,
  undo: 1, wrong: 2, acc: 90, keyAcc: 75, pass: true, keysMap: { a: 10, ' ': 20 },
  ...over,
});

beforeEach(() => { mem.clear(); });

describe('article-history', () => {
  it('空历史返回空数组', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('保存与读取', () => {
    saveRecord(rec());
    saveRecord(rec({ seg: 2, speed: 50 }));
    const list = loadHistory();
    expect(list).toHaveLength(2);
    expect(list[1].seg).toBe(2);
  });

  it('最多保留 200 条', () => {
    for (let i = 0; i < 210; i++) saveRecord(rec({ t: i }));
    expect(loadHistory()).toHaveLength(200);
    expect(loadHistory()[0].t).toBe(10);
  });

  it('清除', () => {
    saveRecord(rec());
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });

  it('聚合按键分布', () => {
    saveRecord(rec({ keysMap: { a: 3, ' ': 4 } }));
    saveRecord(rec({ keysMap: { a: 1, b: 2 } }));
    expect(aggregateKeys(loadHistory())).toEqual({ a: 4, ' ': 4, b: 2 });
  });

  it('TSV 含表头与关键字段', () => {
    const tsv = recordsToTSV([rec()]);
    expect(tsv.split('\n')).toHaveLength(2);
    expect(tsv).toContain('速度');
    expect(tsv).toContain('测试文');
    expect(tsv).toContain('达标');
  });
});
