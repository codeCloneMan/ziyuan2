// src/utils/progressManager.js
/**
 * 字根练习进度管理工具
 * 提供进度保存、加载、清除等功能
 * 安全版本：不会影响其他组件的进度数据
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
      version: '1.0',
    }

    localStorage.setItem('rootPracticeProgress', JSON.stringify(progressData))
    console.log(`进度已保存: ${answeredRoots}个字根`)
  } catch (error) {
    console.error('保存进度失败:', error)
    // 安全处理：只清理当前键的数据，绝不使用全局清理
    try {
      localStorage.removeItem('rootPracticeProgress')
      console.log('已清理损坏的进度数据')
    } catch (clearError) {
      console.error('清理进度数据失败:', clearError)
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
    // 安全处理：只清理可能损坏的数据
    localStorage.removeItem('rootPracticeProgress')
    return null
  }
}

/**
 * 清除保存的进度 - 安全版本，只影响自己的数据
 */
export const clearProgress = () => {
  try {
    // 将进度重置为0而不是删除，确保记录进度为0
    const zeroProgress = {
      mode: 'order',
      correctCount: 0,
      answeredRoots: 0,
      practiceRoots: [],
      isComplete: false,
      timestamp: new Date().toISOString(),
      version: '1.0',
    }
    localStorage.setItem('rootPracticeProgress', JSON.stringify(zeroProgress))
    console.log('进度已重置为0')
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
      keys: Object.keys(localStorage),
    }
  } catch (error) {
    console.error('获取存储信息失败:', error)
    return { error: true }
  }
}

/**
 * 安全的进度清理 - 只清理rootPracticeProgress键
 * 警告：这个函数只应该被RootPractice组件使用
 */
export const safeClearRootProgress = () => {
  try {
    localStorage.removeItem('rootPracticeProgress')
    console.log('RootPractice进度已安全清除')
    return true
  } catch (error) {
    console.error('安全清除RootPractice进度失败:', error)
    return false
  }
}
