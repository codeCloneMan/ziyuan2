import { describe, it, expect } from 'vitest';
import {
  getSpeedEquivalent,
  calcSpeedIndex,
  calcWeightedSpeedEquivalent,
} from './speedEquivalent';

/**
 * 键位相关速度当量（陈一凡表）单元测试
 *
 * 社区基准：最快键对归一化为 1.0（ak / al），最慢 2.1（zw / zq），
 * 方向相关（先击键顺序影响当量）。宇浩官方发布字源 v1.30
 * 全码速度当量 = 1.3473，本表口径与其一致。
 */
describe('键位相关速度当量表', () => {
  it('社区基准键对：ak/al = 1.0，zw = 2.1', () => {
    expect(getSpeedEquivalent('a', 'k')).toBe(1.0);
    expect(getSpeedEquivalent('a', 'l')).toBe(1.0);
    expect(getSpeedEquivalent('z', 'w')).toBe(2.1);
    expect(getSpeedEquivalent('z', 'q')).toBe(2.1);
  });

  it('方向相关：ak ≠ ka', () => {
    expect(getSpeedEquivalent('a', 'k')).not.toBe(getSpeedEquivalent('k', 'a'));
  });

  it('全部 26×26 字母键对均有定义：字母区间 1.0~2.1，数字键对亦有定义', () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    for (const a of letters) {
      for (const b of letters) {
        const eq = getSpeedEquivalent(a, b);
        expect(eq).toBeGreaterThanOrEqual(1.0);
        expect(eq).toBeLessThanOrEqual(2.1);
      }
    }
    // 数字键对（码表含数字编码时）：至少有定义且不低于 1.0
    const digits = '0123456789';
    for (const a of digits) {
      for (const b of digits) {
        expect(getSpeedEquivalent(a, b)).toBeGreaterThanOrEqual(1.0);
      }
    }
  });

  it('未知键对（标点/通配符）按最慢档 2.1 处理', () => {
    expect(getSpeedEquivalent(';', 'a')).toBe(2.1);
  });
});

describe('速度指数', () => {
  it('speedIndex = 100 / 速度当量', () => {
    expect(calcSpeedIndex(1.0)).toBe(100);
    expect(calcSpeedIndex(1.3473)).toBeCloseTo(74.22, 1);
    expect(calcSpeedIndex(0)).toBe(0);
  });
});

describe('calcWeightedSpeedEquivalent', () => {
  const freq: Record<string, number> = { '的': 0.4, '字': 0.6 };

  it('跳过非字母二元组（数字/通配符间隔）', () => {
    // 'a1k' 只有 ak 一个字母二元组 → 加权后 = 1.0
    const eq = calcWeightedSpeedEquivalent([{ char: '的', code: 'a1k' }], freq);
    expect(eq).toBe(1.0);
  });

  it('字频加权：高编码当量的字权重大时结果偏向其当量', () => {
    // 假设 vk 是慢键对（同手小指+食指），ak 快
    const slow = getSpeedEquivalent('v', 'k');
    const fast = getSpeedEquivalent('a', 'k');
    const skewed = calcWeightedSpeedEquivalent(
      [
        { char: '的', code: 'ak' },
        { char: '字', code: 'vk' },
      ],
      freq,
    );
    // freq: 的 0.4 / 字 0.6 → 偏向 vk 的当量
    expect(slow).toBeGreaterThan(fast);
    expect(skewed).toBeGreaterThan((slow + fast) / 2);
    expect(skewed).toBeLessThan(slow);
  });

  it('无可用二元组时返回 0', () => {
    expect(calcWeightedSpeedEquivalent([{ char: '的', code: 'a' }], freq)).toBe(0);
  });
});
