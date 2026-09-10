/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildFullCodeIndex } from './full-codes';
import { getPhraseCodes } from './phrase-codes';

describe('词组取码（getPhraseCodes）', () => {
  it('二个字词：各取前 2 码', () => {
    const index = buildFullCodeIndex([
      { char: '时', code: 'nds' },
      { char: '分', code: 'izf' },
    ]);
    expect(getPhraseCodes('时分', index)).toEqual(['ndiz']);
  });

  it('三个字词：前两字各 1 码 + 末字 2 码', () => {
    const index = buildFullCodeIndex([
      { char: '时', code: 'nds' },
      { char: '分', code: 'izf' },
      { char: '钟', code: 'zvz' },
    ]);
    expect(getPhraseCodes('时分钟', index)).toEqual(['nizv']);
  });

  it('某字有多个等长全码时，词组的所有组合都算对', () => {
    const index = buildFullCodeIndex([
      { char: '万', code: 'lmo' },
      { char: '万', code: 'lwa' },
      { char: '年', code: 'abc' },
    ]);
    expect(getPhraseCodes('万年', index)).toEqual(['lmab', 'lwab']);
  });

  it('词组只认全码，简码不参与取码', () => {
    const index = buildFullCodeIndex([
      { char: '好', code: 'a' },    // 一级简码
      { char: '好', code: 'ahh' },  // 全码
      { char: '年', code: 'abc' },
    ]);
    // 取全码 ahh 的前 2 码 ah（若误用简码 a 会得到 3 码 "aab"，长度不足被丢弃）
    expect(getPhraseCodes('好年', index)).toEqual(['ahab']);
  });

  it('缺字 / 单字返回空数组（该词不入题库）', () => {
    const index = buildFullCodeIndex([{ char: '好', code: 'ahh' }]);
    expect(getPhraseCodes('好', index)).toEqual([]);
    expect(getPhraseCodes('好坏', index)).toEqual([]);
  });

  it('真实码表：万岁 = lmim / lwim 都算对，为了 = vohl', () => {
    const data = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../public/data/charCodeData.json'), 'utf8')
    ) as { char: string; code: string }[];
    const index = buildFullCodeIndex(data);
    expect(getPhraseCodes('万岁', index)).toEqual(['lmim', 'lwim']);
    expect(getPhraseCodes('为了', index)).toEqual(['vohl']);
  });
});
