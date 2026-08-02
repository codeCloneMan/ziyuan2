import { describe, it, expect } from 'vitest';
import { practiceRootMappings, renderableKeyGroups, type RootMapping } from '@/data/roots';
import { calcMasteredRootCount } from './mastered-count';

describe('计数问题排查', () => {
  it('检查不同数据源的 totalRoots 是否一致', () => {
    // PracticePage 使用 allRootIds.length
    const allRootIds = practiceRootMappings.map(r => r.char);
    const practiceTotal = allRootIds.length;
    
    // TablePage 使用 renderableKeyGroups.reduce
    const tableTotal = renderableKeyGroups.reduce((sum, g) => sum + g.roots.length, 0);
    
    // 正确的唯一字根数（去重后）
    const uniqueChars = new Set(practiceRootMappings.map(r => r.char));
    const uniqueTotal = uniqueChars.size;
    
    console.log('PracticePage 使用的 totalRoots:', practiceTotal);
    console.log('TablePage 使用的 totalRoots:', tableTotal);
    console.log('唯一字根数（去重后）:', uniqueTotal);
    console.log('差异（重复字符数）:', practiceTotal - uniqueTotal);
  });

  it('检查 practiceRootMappings 重复字符详情', () => {
    const charMap = new Map<string, RootMapping[]>();
    
    practiceRootMappings.forEach(r => {
      if (!charMap.has(r.char)) {
        charMap.set(r.char, []);
      }
      charMap.get(r.char)!.push(r);
    });
    
    const duplicates = Array.from(charMap.entries())
      .filter(([, v]) => v.length > 1);
    
    console.log('\n重复字符详情：');
    duplicates.forEach(([char, entries]) => {
      console.log(`  字符: ${char}`);
      console.log(`  Unicode: U+${char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0')}`);
      console.log(`  出现次数: ${entries.length}`);
      entries.forEach((e, idx) => {
        console.log(`    ${idx + 1}. 键位: ${e.key}, codePoint: ${e.codePoint.toString(16).toUpperCase()}`);
      });
    });
  });

  it('验证计数逻辑的正确性', () => {
    // 模拟场景：用户练习了一些字根
    const correctCountMap: Record<string, number> = {
      '白': 3,
      '日': 3,
      '月': 5,
      '木': 2,
    };
    
    const mastered = calcMasteredRootCount(correctCountMap);
    console.log('\n掌握计数测试:');
    console.log('correctCountMap:', correctCountMap);
    console.log('已掌握数:', mastered);
    
    // 白、日、月 都 >= 3，应该返回 3
    expect(mastered).toBe(3);
  });

  it('检查 renderableKeyGroups 是否也有重复', () => {
    const charSet = new Set<string>();
    const duplicates: string[] = [];
    
    renderableKeyGroups.forEach(group => {
      group.roots.forEach(r => {
        if (charSet.has(r.char)) {
          duplicates.push(r.char);
        }
        charSet.add(r.char);
      });
    });
    
    console.log('\nrenderableKeyGroups 重复字根数:', duplicates.length);
    if (duplicates.length > 0) {
      console.log('重复字符:', duplicates);
    }
  });
});
