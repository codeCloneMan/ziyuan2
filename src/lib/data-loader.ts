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
const DATA_BASE = '/data';

export const loadCharCodeData = () =>
  fetchJSON<CharCodeItem[]>(`${DATA_BASE}/charCodeData.json`);

export const loadBuiltinPhrases = () =>
  fetchJSON<BuiltinPhrasesData>(`${DATA_BASE}/builtinPhrases.json`);

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
// 预加载（可在路由切换时调用）
// ========================================
export function preloadCharCodeData() {
  loadCharCodeData();
}

export function preloadBuiltinPhrases() {
  loadBuiltinPhrases();
}
