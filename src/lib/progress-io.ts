/**
 * 学习进度导出/导入工具 (v2 - 基于统一 Store)
 *
 * 所有进度数据已收敛到单一 store key，导入导出直接序列化整个 store。
 */

import {
  exportProgress as storeExport,
  downloadProgress as storeDownload,
  importProgressFromJSON as storeImportJSON,
  importProgressFromFile as storeImportFile,
  clearAllProgress as storeClear,
} from '@/store/progress-store';

/** 导出所有学习进度为 JSON 字符串 */
export function exportProgress(): string {
  return storeExport();
}

/** 下载进度数据为 JSON 文件 */
export function downloadProgress(): void {
  storeDownload();
}

/** 从 JSON 字符串导入进度数据 */
export function importProgressFromJSON(json: string): { success: number; failed: string[]; errors: string[] } {
  const result = storeImportJSON(json);
  if (result.success) {
    return { success: 1, failed: [], errors: [] };
  }
  return { success: 0, failed: [], errors: [result.error || '导入失败'] };
}

/** 从文件导入进度数据 */
export function importProgressFromFile(file: File): Promise<{ success: number; failed: string[]; errors: string[] }> {
  return storeImportFile(file).then(result => {
    if (result.success) {
      return { success: 1, failed: [], errors: [] };
    }
    return { success: 0, failed: [], errors: [result.error || '导入失败'] };
  });
}

/** 清除所有学习进度数据 */
export function clearAllProgress(): void {
  storeClear();
}
