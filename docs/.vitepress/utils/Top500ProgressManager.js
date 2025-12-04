// src/utils/Top500ProgressManager.js

/**
 * 生成存储键名
 * @param {string} pageKey - 页面标识
 * @returns {string} 完整的存储键名
 */
const getStorageKey = (pageKey = 'top500') => {
  return `${pageKey}PracticeProgress`
}

/**
 * 保存练习进度 - 只有当练习量大于等于1时才保存
 * @param {string} mode - 练习模式 ('order' 或 'shuffle')
 * @param {number} correctCount - 正确回答数量
 * @param {number} answeredRoots - 已回答的字根数量
 * @param {Array} practiceRoots - 练习的字根数组
 * @param {boolean} isComplete - 是否完成练习
 * @param {string} pageKey - 页面标识
 */
export const saveProgress = (mode, correctCount, answeredRoots, practiceRoots, isComplete, pageKey = 'top500') => {
  try {
    // 只有当练习量大于等于1时才保存进度
    if (answeredRoots < 1) {
      console.log(`[${pageKey}] 练习量小于1，不保存进度`)
      return
    }
    
    const progressData = {
      mode,
      correctCount,
      answeredRoots,
      practiceRoots,
      isComplete,
      timestamp: new Date().toISOString(),
      version: '1.0'
    }
    
    const storageKey = getStorageKey(pageKey)
    localStorage.setItem(storageKey, JSON.stringify(progressData))
    console.log(`[${pageKey}] 进度已保存: ${answeredRoots}个字根`)
  } catch (error) {
    console.error(`[${pageKey}] 保存进度失败:`, error)
  }
}

/**
 * 加载保存的进度
 * @param {string} pageKey - 页面标识
 * @returns {Object|null} 进度数据或null
 */
export const loadProgress = (pageKey = 'top500') => {
  try {
    const storageKey = getStorageKey(pageKey)
    const saved = localStorage.getItem(storageKey)
    return saved ? JSON.parse(saved) : null
  } catch (error) {
    console.error(`[${pageKey}] 加载进度失败:`, error)
    // 清理可能损坏的数据
    const storageKey = getStorageKey(pageKey)
    localStorage.removeItem(storageKey)
    return null
  }
}

/**
 * 清除保存的进度
 * @param {string} pageKey - 页面标识
 */
export const clearProgress = (pageKey = 'top500') => {
  const storageKey = getStorageKey(pageKey)
  localStorage.removeItem(storageKey)
  console.log(`[${pageKey}] 进度已清除`)
}

/**
 * 判断是否应该恢复进度
 * @param {Object} progressData - 进度数据
 * @returns {boolean} 是否应该恢复
 */
export const shouldRestoreProgress = (progressData) => {
  if (!progressData) return false
  
  // 只有当练习量大于等于1时才允许恢复
  return progressData.answeredRoots >= 1
}