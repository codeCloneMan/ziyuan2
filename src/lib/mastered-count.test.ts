import { describe, it, expect } from 'vitest';
import { calcMasteredRootCount } from './mastered-count';

/**
 * 字根练习"已掌握"计数单元测试
 *
 * 背景：PracticePage 的 masteredCount 在入门模式下曾读取
 *   spaced.stats.mastered（本次会话的掌握池大小）。
 * 该池在每次开始练习时被 resetProgress() 清空，导致即便用户
 * 之前已掌握多个字根，重启练习后状态栏仍显示 "已掌握 0/329"。
 *
 * 期望：掌握计数应基于统一 store 的累计 correctCountMap
 *  （与首页进度、成就、键盘淡化同口径），与模式无关。
 */
describe('calcMasteredRootCount', () => {
  it('空 correctCountMap 时返回 0', () => {
    expect(calcMasteredRootCount({})).toBe(0);
  });

  it('全部字根正确次数 < 3 时返回 0', () => {
    const correctCountMap = { '白': 1, '日': 2, '月': 0 };
    expect(calcMasteredRootCount(correctCountMap)).toBe(0);
  });

  it('正确次数恰好达到 3 即视为已掌握', () => {
    const correctCountMap = { '白': 3, '日': 2, '月': 3 };
    // 白、月 达到 3 → 2 个
    expect(calcMasteredRootCount(correctCountMap)).toBe(2);
  });

  it('正确次数超过 3 仍计入已掌握', () => {
    const correctCountMap = { '白': 5, '日': 10, '月': 4, '木': 2 };
    // 白、日、月 均 >= 3 → 3 个；木 不足
    expect(calcMasteredRootCount(correctCountMap)).toBe(3);
  });

  it('忽略 wrongCountMap，仅按 correctCountMap 统计', () => {
    // 即使有错题记录，只要 correctCount >= 3 即掌握
    const correctCountMap = { '白': 3, '日': 3 };
    expect(calcMasteredRootCount(correctCountMap)).toBe(2);
  });

  it('与首页/成就/键盘淡化同口径：基于累计 correctCountMap，与会话无关', () => {
    // 模拟用户跨会话累计掌握 5 个字根后重启练习的场景：
    // spaced.stats.mastered 会被 resetProgress 清成 0，
    // 但 correctCountMap 仍保留历史累计值。
    const correctCountMap = {
      '白': 4, '日': 3, '月': 5, '木': 3, '水': 6,
      '火': 1, '土': 2,
    };
    // 前 5 个 >= 3 → 5 个；火、土 不足
    expect(calcMasteredRootCount(correctCountMap)).toBe(5);
  });
});
