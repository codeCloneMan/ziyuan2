/**
 * 数据文件运行时加载器
 * 
 * 将大型数据文件（charCodeData 3.6MB、builtinPhrases 0.9MB）
 * 从静态 import 改为按需 fetch，大幅减少首屏 JS 体积。
 */

// ========================================
// 通用 JSON 缓存
// ========================================
const jsonCache = new Map<string, unknown>();

export async function fetchJSON<T>(url: string): Promise<T> {
  const cached = jsonCache.get(url);
  if (cached !== undefined) return cached as T;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const data: T = await res.json();
  jsonCache.set(url, data);
  return data;
}

// ========================================
// 数据类型定义
// ========================================
export interface CharCodeItem {
  char: string;
  code: string;
}

export interface BuiltinPhrasesData {
  twoCharPhrases: string[];
  twoCharFreqs: number[];
  threeCharPhrases: string[];
  threeCharFreqs: number[];
  fourCharPhrases: string[];
  fourCharFreqs: number[];
  longCharPhrases: string[];
  longCharFreqs: number[];
  PHRASE_FREQ_TOTAL: number;
  PHRASE_COUNTS: Record<string, number>;
}

// ========================================
// 预定义加载器
// ========================================
function getDataUrl(name: string): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${base}/data/${name}`;
}

export const loadCharCodeData = () =>
  fetchJSON<CharCodeItem[]>(getDataUrl('charCodeData.json'));

export const loadBuiltinPhrases = () =>
  fetchJSON<BuiltinPhrasesData>(getDataUrl('builtinPhrases.json'));

// ========================================
// React Hook
// ========================================
import { useState, useEffect, useCallback } from 'react';

interface UseDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useData<T>(loader: () => Promise<T>): UseDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loader()
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e : new Error(String(e))); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loader]);

  // 数据获取标准模式：loader 变化时重新加载
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => load(), [load]);

  return { data, loading, error, refetch: () => load() };
}

// ========================================
// 便捷 Hooks
// ========================================
export function useCharCodeData() {
  return useData(loadCharCodeData);
}

export function useBuiltinPhrases() {
  return useData(loadBuiltinPhrases);
}

// ========================================
// 搜索索引（避免每次搜索全量遍历 6763 条数据）
// ========================================

/** 字符索引：char → CharCodeItem[]（一个字可能有多个编码） */
export type CharCodeIndex = Map<string, CharCodeItem[]>;

/** 为 charCodeData 构建搜索索引 */
export function buildCharCodeIndex(data: CharCodeItem[]): CharCodeIndex {
  const index = new Map<string, CharCodeItem[]>();
  for (const item of data) {
    const existing = index.get(item.char);
    if (existing) {
      existing.push(item);
    } else {
      index.set(item.char, [item]);
    }
  }
  return index;
}

/**
 * 在索引中快速搜索
 * @param index 搜索索引
 * @param query 搜索词（单字或编码前缀）
 * @param maxResults 最大结果数
 */
export function searchCharCodeIndex(
  index: CharCodeIndex,
  query: string,
  maxResults: number = 10,
): CharCodeItem[] {
  const results: CharCodeItem[] = [];
  const q = query.toLowerCase();

  // 精确字符匹配（O(1)）
  const exact = index.get(q);
  if (exact) {
    for (const item of exact) {
      if (results.length >= maxResults) return results;
      results.push(item);
    }
  }

  // 编码前缀匹配（遍历索引值，但比全量遍历快，因为只在有数据时才检查）
  if (results.length < maxResults) {
    for (const items of index.values()) {
      for (const item of items) {
        if (results.length >= maxResults) return results;
        if (item.code.toLowerCase().startsWith(q) && !results.some(r => r.char === item.char && r.code === item.code)) {
          results.push(item);
        }
      }
    }
  }

  return results;
}

// ========================================
// 预加载（可在路由切换时调用）
// ========================================
export function preloadCharCodeData() {
  loadCharCodeData();
}

export function preloadBuiltinPhrases() {
  loadBuiltinPhrases();
}
