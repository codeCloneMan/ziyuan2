// src/utils/progressManager.js
/**
 * 字根练习进度管理工具
 * 提供进度保存、加载、清除等功能
 */

/**
 * 保存练习进度 - 只有当练习量大于等于1时才保存
 * @param {string} mode - 练习模式 ('order' 或 'shuffle')
 * @param {number} correctCount - 正确回答数量
 * @param {number} answeredRoots - 已回答的字根数量
 * @param {Array} practiceRoots - 练习的字根数组
 * @param {boolean} isComplete - 是否完成练习
 */
export const saveProgress = (mode, correctCount, answeredRoots, practiceRoots, isComplete) => {
  try {
    // 只有当练习量大于等于1时才保存进度
    if (answeredRoots < 1) {
      console.log('练习量小于1，不保存进度')
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
    
    localStorage.setItem('rootPracticeProgress', JSON.stringify(progressData))
    console.log(`进度已保存: ${answeredRoots}个字根`)
  } catch (error) {
    console.error('保存进度失败:', error)
    // 如果存储空间不足，尝试清理旧数据
    try {
      localStorage.clear()
    } catch (clearError) {
      console.error('清理存储失败:', clearError)
    }
  }
}

/**
 * 加载保存的进度
 * @returns {Object|null} 进度数据或null
 */
export const loadProgress = () => {
  try {
    const saved = localStorage.getItem('rootPracticeProgress')
    if (!saved) return null
    
    const data = JSON.parse(saved)
    
    // 验证数据完整性
    if (!data.mode || !Array.isArray(data.practiceRoots)) {
      console.warn('进度数据格式不正确，已清除')
      localStorage.removeItem('rootPracticeProgress')
      return null
    }
    
    return data
  } catch (error) {
    console.error('加载进度失败:', error)
    // 清理可能损坏的数据
    localStorage.removeItem('rootPracticeProgress')
    return null
  }
}

/**
 * 清除保存的进度
 */
export const clearProgress = () => {
  try {
    localStorage.removeItem('rootPracticeProgress')
    console.log('进度已清除')
  } catch (error) {
    console.error('清除进度失败:', error)
  }
}

/**
 * 判断是否应该恢复进度
 * @param {Object} progressData - 进度数据
 * @returns {boolean} 是否应该恢复
 */
export const shouldRestoreProgress = (progressData) => {
  if (!progressData) return false
  
  // 检查数据完整性
  if (!progressData.mode || typeof progressData.answeredRoots !== 'number') {
    return false
  }
  
  // 只有当练习量大于等于1时才允许恢复
  return progressData.answeredRoots >= 1
}

/**
 * 获取存储使用情况（调试用）
 * @returns {Object} 存储信息
 */
export const getStorageInfo = () => {
  try {
    const used = JSON.stringify(localStorage).length
    const total = 5 * 1024 * 1024 // 假设5MB限制
    const percentage = ((used / total) * 100).toFixed(2)
    
    return {
      used,
      total,
      percentage,
      keys: Object.keys(localStorage)
    }
  } catch (error) {
    console.error('获取存储信息失败:', error)
    return { error: true }
  }
}
