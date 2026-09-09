// 字根练习的官方图集题库（数据本体由 scripts/generate-root-images.mjs 生成）。
//
// 设计要点：练习单元 = 一张官方字根图，答案键位 = 文件名首字母
// （官方命名规则，见 字源输入法字根练习1.32/说明.txt："第一个字母为该键所在位"）。
// 因此"图 ↔ 键位"映射零猜测、零歧义；字源图中没有裁剪图的字根变体
// （老变、立变等）不进入练习——官方练习软件同样只练这个图集。
import { ROOT_IMAGE_POOL } from './root-images.generated';
import type { RootImage } from './root-images.generated';

export type { RootImage };
export { ROOT_IMAGE_POOL };

/** 题库 ID 列表（= 图片文件名），入门/进阶模式与统计共用 */
export const allImageIds: string[] = ROOT_IMAGE_POOL.map(i => i.file);

/** 题库 ID 集合，用于统计清洗时判定"属于当前练习池" */
export const imagePoolSet: ReadonlySet<string> = new Set(allImageIds);

/** 按键位分组的图（键盘淡化判定用：某键全部图均掌握才淡化） */
export const imagesByKey: Record<string, RootImage[]> = (() => {
  const map: Record<string, RootImage[]> = {};
  for (const img of ROOT_IMAGE_POOL) {
    (map[img.key] ??= []).push(img);
  }
  return map;
})();

/** 图文件对应的公开 URL（public/roots/ 下） */
export function rootImagePath(file: string): string {
  return `${import.meta.env.BASE_URL}roots/${file}`;
}
