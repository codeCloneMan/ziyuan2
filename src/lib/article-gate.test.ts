import { describe, it, expect } from 'vitest';
import { isAccPassed, canAdvanceSegment, isResultBlocked } from './article-gate';

describe('文章练习最低准度门槛', () => {
  it('不设门槛（0）时永远达标、可自由前进', () => {
    expect(isAccPassed(0, 0)).toBe(true);
    expect(isAccPassed(0, 42)).toBe(true);
    expect(canAdvanceSegment(0, new Set(), 3)).toBe(true);
    expect(isResultBlocked(0, 10)).toBe(false);
  });

  it('设了门槛就按准度判定，等于门槛算达标', () => {
    expect(isAccPassed(95, 95)).toBe(true);
    expect(isAccPassed(95, 96)).toBe(true);
    expect(isAccPassed(95, 94)).toBe(false);
    expect(isAccPassed(100, 99)).toBe(false);
  });

  it('未达标的段不允许前进（挡住「上一段→下一段」绕过）', () => {
    // 第 2 段没达标，无论面板状态怎么被切段清空，都不许往后走
    expect(canAdvanceSegment(98, new Set([0, 1]), 2)).toBe(false);
    expect(canAdvanceSegment(98, new Set(), 2)).toBe(false);
  });

  it('达标后的段允许前进', () => {
    expect(canAdvanceSegment(98, new Set([0, 1, 2]), 2)).toBe(true);
  });

  it('准度不足时结算面板被锁，门槛调低后立刻解锁（不用重打）', () => {
    expect(isResultBlocked(98, 90)).toBe(true);
    expect(isResultBlocked(90, 90)).toBe(false);
    expect(isResultBlocked(0, 90)).toBe(false);
  });

  it('门槛值异常（NaN / 负数）时按不设门槛处理', () => {
    expect(isAccPassed(Number.NaN, 50)).toBe(true);
    expect(canAdvanceSegment(-1, new Set(), 2)).toBe(true);
  });
});
