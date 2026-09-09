/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import crypto from 'node:crypto';
import { ROOT_IMAGE_POOL, allImageIds, imagesByKey } from './root-images';

/**
 * 官方图集题库（root-images.generated.ts）与 public/roots/ 磁盘内容同步测试。
 *
 * 练习单元 = 一张官方字根图，答案键位 = 文件名首字母（官方命名规则）。
 * 生成器：scripts/generate-root-images.mjs（图集更新后重新运行）。
 * 本测试防止"图集文件与生成清单脱节"——新增/删除图片后必须重新生成。
 */
describe('官方图集题库', () => {
  const rootsDir = resolve(import.meta.dirname, '../../public/roots');
  const diskFiles = readdirSync(rootsDir).filter(f => /^[a-z].*\.png$/i.test(f));

  it('清单与磁盘一一对应（390 张，仅字节级重复图被排除）', () => {
    for (const img of ROOT_IMAGE_POOL) {
      expect(existsSync(resolve(rootsDir, img.file)), `清单中的图不存在: ${img.file}`).toBe(true);
    }
    // 磁盘上不在清单里的文件，必须是字节级重复图
    const inPool = new Set(allImageIds);
    const hashOf = (f: string) => crypto.createHash('md5').update(readFileSync(resolve(rootsDir, f))).digest('hex');
    const poolHashes = new Set([...inPool].map(hashOf));
    for (const f of diskFiles) {
      if (inPool.has(f)) continue;
      expect(poolHashes.has(hashOf(f)), `磁盘文件 ${f} 既不在清单也不与任何清单内图重复（需重新生成清单）`).toBe(true);
    }
  });

  it('答案键位 = 文件名首字母，26 键位全覆盖', () => {
    for (const img of ROOT_IMAGE_POOL) {
      expect(img.key).toBe(img.file[0].toLowerCase());
    }
    const keys = new Set(ROOT_IMAGE_POOL.map(i => i.key));
    for (const k of 'qwertyuiopasdfghjklzxcvbnm') {
      expect(keys.has(k), `键位 ${k} 无图`).toBe(true);
    }
  });

  it('题库内无字节级重复（同一张图不重复出题）', () => {
    const hashes = ROOT_IMAGE_POOL.map(i => crypto.createHash('md5').update(readFileSync(resolve(rootsDir, i.file))).digest('hex'));
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it('按键位分组完整（键盘淡化判定依赖）', () => {
    expect(Object.values(imagesByKey).flat()).toHaveLength(ROOT_IMAGE_POOL.length);
    for (const [key, imgs] of Object.entries(imagesByKey)) {
      for (const img of imgs) expect(img.key).toBe(key);
    }
  });
});
