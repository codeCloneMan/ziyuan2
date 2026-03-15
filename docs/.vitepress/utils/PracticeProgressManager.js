/**
 * 练习进度管理器
 * 提供统一的进度保存和恢复功能
 */

// 进度数据结构
const PROGRESS_KEYS = {
  TOP500: 'top500_progress',
  MODERN: 'modern_progress',
  ERROR: 'error_progress',
  TYPING: 'typing_progress',
}

// 保存进度
export function saveProgress(key, data) {
  try {
    const progressData = {
      ...data,
      timestamp: Date.now(),
      version: '1.0',
    }
    localStorage.setItem(key, JSON.stringify(progressData))
    console.log(`进度已保存: ${key}`)
    return true
  } catch (error) {
    console.error(`保存进度失败 (${key}):`, error)
    return false
  }
}

// 加载进度
export function loadProgress(key) {
  try {
    const saved = localStorage.getItem(key)
    if (!saved) return null

    const data = JSON.parse(saved)

    // 检查数据是否过期（7天）
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
    if (Date.now() - data.timestamp > SEVEN_DAYS) {
      console.log(`进度已过期: ${key}`)
      localStorage.removeItem(key)
      return null
    }

    console.log(`进度已加载: ${key}`)
    return data
  } catch (error) {
    console.error(`加载进度失败 (${key}):`, error)
    return null
  }
}

// 清除进度
export function clearProgress(key) {
  try {
    // 将进度重置为0而不是删除，确保记录进度为0
    const zeroProgress = {
      progress: 0,
      accuracy: 0,
      masteryRate: 0,
      masteredCount: 0,
      remainingCount: 0,
      elapsedTime: 0,
      totalAttempts: 0,
      totalCorrect: 0,
      totalWrong: 0,
      isComplete: false,
      isPaused: false,
      timestamp: Date.now(),
      currentIndex: 0,
      rootStats: {},
    }
    localStorage.setItem(key, JSON.stringify(zeroProgress))
    console.log(`进度已重置为0: ${key}`)
    return true
  } catch (error) {
    console.error(`清除进度失败 (${key}):`, error)
    return false
  }
}

// 检查是否有可恢复的进度
export function hasProgress(key) {
  const progress = loadProgress(key)
  return progress !== null
}

// 获取所有进度
export function getAllProgress() {
  const progress = {}
  Object.values(PROGRESS_KEYS).forEach((key) => {
    const data = loadProgress(key)
    if (data) {
      progress[key] = data
    }
  })
  return progress
}

// 清除所有进度
export function clearAllProgress() {
  Object.values(PROGRESS_KEYS).forEach((key) => {
    clearProgress(key)
  })
  console.log('所有进度已清除')
  return true
}

// 进度统计
export function getProgressStats() {
  const stats = {
    total: 0,
    completed: 0,
    accuracy: 0,
    timeSpent: 0,
  }

  Object.values(PROGRESS_KEYS).forEach((key) => {
    const data = loadProgress(key)
    if (data) {
      stats.total++
      if (data.isComplete) stats.completed++
      if (data.accuracy) stats.accuracy += data.accuracy
      if (data.timeSpent) stats.timeSpent += data.timeSpent
    }
  })

  if (stats.total > 0) {
    stats.accuracy = Math.round(stats.accuracy / stats.total)
  }

  return stats
}

// 导出进度到文件
export function exportProgress() {
  try {
    const allProgress = getAllProgress()
    const dataStr = JSON.stringify(allProgress, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

    const exportFileDefaultName = `ziyuan_progress_${Date.now()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()

    console.log('进度已导出')
    return true
  } catch (error) {
    console.error('导出进度失败:', error)
    return false
  }
}

// 从文件导入进度
export function importProgress(file) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader()

      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target.result)

          // 验证导入的数据结构
          if (typeof importedData !== 'object') {
            throw new Error('无效的进度文件格式')
          }

          // 保存导入的进度
          Object.entries(importedData).forEach(([key, data]) => {
            if (Object.values(PROGRESS_KEYS).includes(key)) {
              saveProgress(key, data)
            }
          })

          console.log('进度已导入')
          resolve(true)
        } catch (error) {
          console.error('解析进度文件失败:', error)
          reject(error)
        }
      }

      reader.onerror = (error) => {
        console.error('读取文件失败:', error)
        reject(error)
      }

      reader.readAsText(file)
    } catch (error) {
      console.error('导入进度失败:', error)
      reject(error)
    }
  })
}

// 进度同步（如果需要的话）
export function syncProgress() {
  // 这里可以添加云端同步逻辑
  console.log('进度同步功能待实现')
  return Promise.resolve(true)
}

// 默认导出
export default {
  PROGRESS_KEYS,
  saveProgress,
  loadProgress,
  clearProgress,
  hasProgress,
  getAllProgress,
  clearAllProgress,
  getProgressStats,
  exportProgress,
  importProgress,
  syncProgress,
}
