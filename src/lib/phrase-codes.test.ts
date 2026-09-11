/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildFullCodeIndex } from './full-codes';
import { getPhraseCodeInfo } from './phrase-codes';

describe('词组取码（官方码优先"恰好键数"）', () => {
  it('二个字词：各取 2 键', () => {
    const index = buildFullCodeIndex([
      { char: '时', code: 'nds' },
      { char: '分', code: 'izf' },
    ]);
    expect(getPhraseCodeInfo('时分', index)?.accepted).toEqual(['ndiz']);
    expect(getPhraseCodeInfo('时分', index)?.perChar).toEqual(['nd', 'iz']);
  });

  it('三个字词：前两字各 1 键 + 末字 2 键', () => {
    const index = buildFullCodeIndex([
      { char: '时', code: 'nds' },
      { char: '分', code: 'izf' },
      { char: '钟', code: 'zvz' },
    ]);
    expect(getPhraseCodeInfo('时分钟', index)?.accepted).toEqual(['nizv']);
  });

  it('四个字词：前三字各 1 键 + 末字 1 键', () => {
    const index = buildFullCodeIndex([
      { char: '时', code: 'nds' },
      { char: '分', code: 'izf' },
      { char: '钟', code: 'zvz' },
      { char: '头', code: 'tdt' },
    ]);
    expect(getPhraseCodeInfo('时分钟头', index)?.accepted).toEqual(['nizt']);
    expect(getPhraseCodeInfo('时分钟头', index)?.perChar).toEqual(['n', 'i', 'z', 't']);
  });

  it('单字优先取恰好键数的官方码（简码），不再用最长码截断', () => {
    const index = buildFullCodeIndex([
      { char: '无', code: 'hmo' }, // 最长码（3 键）
      { char: '无', code: 'hw' },  // 2 键简码
      { char: '法', code: 'cbj' },
    ]);
    const info = getPhraseCodeInfo('无法', index)!;
    expect(info.accepted).toEqual(['hwcb']);
    expect(info.accepted).not.toContain('hmcb'); // 旧的长码截断变体不再算对
    expect(info.perChar).toEqual(['hw', 'cb']);
  });

  it('某字没有恰好键数的码时，取更长官方码的前 N 键', () => {
    const index = buildFullCodeIndex([
      { char: '万', code: 'lmo' },
      { char: '万', code: 'lw' },
      { char: '万', code: 'lwa' },
      { char: '岁', code: 'ims' },
    ]);
    const info = getPhraseCodeInfo('万岁', index)!;
    expect(info.accepted).toEqual(['lwim']); // 万 用 2 键码 lw；岁 无 2 键码 → 取 ims 前 2 键
    expect(info.accepted).not.toContain('lmim');
  });

  it('某字所有码都短于所需键数时，词码不足 4 键（练习按空格上屏）', () => {
    const index = buildFullCodeIndex([
      { char: '可', code: 'dk' },
      { char: '能', code: 'j' }, // 码表里只有 1 键码
    ]);
    const info = getPhraseCodeInfo('可能', index)!;
    expect(info.accepted).toEqual(['dkj']);
    expect(info.perChar).toEqual(['dk', 'j']);
  });

  it('缺字 / 单字返回 null（该词不入题库）', () => {
    const index = buildFullCodeIndex([{ char: '好', code: 'ahh' }]);
    expect(getPhraseCodeInfo('好', index)).toBeNull();
    expect(getPhraseCodeInfo('好坏', index)).toBeNull();
  });

  it('真实码表：无法 = hwcb、万岁 = lwim、可能 = dkj、作为一个 = svqs', () => {
    const data = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../public/data/charCodeData.json'), 'utf8')
    ) as { char: string; code: string }[];
    const index = buildFullCodeIndex(data);
    expect(getPhraseCodeInfo('无法', index)?.accepted).toEqual(['hwcb']);
    expect(getPhraseCodeInfo('万岁', index)?.accepted).toEqual(['lwim']);
    expect(getPhraseCodeInfo('可能', index)?.accepted).toEqual(['dkj']);
    expect(getPhraseCodeInfo('作为一个', index)?.accepted).toEqual(['svqs']);
    expect(getPhraseCodeInfo('这个问题', index)?.accepted).toEqual(['yspn']);
    // 为了 = 为(voh) 取 2 键 vo + 了（hle/hli 无 2 键码 → 取 hl）→ vohl
    expect(getPhraseCodeInfo('为了', index)?.accepted).toEqual(['vohl']);
  });
});
