/**
 * 统一进度管理器 - 替代多个重复的进度管理工具
 * 整合了 progressManager.js 和 PracticeProgressManager.js 的功能
 * 提供更健壮的存储管理和进度恢复功能
 */

import {
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  getAllKeys,
  clearAllPracticeStorage,
} from './safeStorage.js'

// 进度数据键名常量
export const PROGRESS_KEYS = {
  ROOT_PRACTICE: 'root_practice',
  TOP500: 'top500_progress',
  MODERN: 'modern_progress',
  ERROR: 'error_progress',
  TYPING: 'typing_progress',
  CROSS_PRACTICE: 'cross_practice',
}

// 进度数据默认过期时间（7天）
const PROGRESS_MAX_AGE = 7 * 24 * 60 * 60 * 1000

/**
 * 验证进度数据完整性
 * @param {*} data - 进度数据
 * @returns {boolean}
 */
const validateProgressData = (data) => {
  if (!data || typeof data !== 'object') return false
  if (!data.timestamp || typeof data.timestamp !== 'number') return false
  if (Date.now() - data.timestamp > PROGRESS_MAX_AGE) return false
  return true
}

/**
 * 保存进度数据
 * @param {string} key - 进度键名
 * @param {Object} data - 进度数据
 * @returns {boolean}
 */
export const saveProgress = (key, data) => {
  try {
    if (!Object.values(PROGRESS_KEYS).includes(key)) {
      console.warn(`Invalid progress key: ${key}`)
      return false
    }

    const progressData = {
      ...data,
      timestamp: Date.now(),
      version: '2.0',
      userAgent: navigator.userAgent.slice(0, 100), // 保存部分用户代理用于兼容性检查
    }

    return safeSetItem(key, progressData)
  } catch (error) {
    console.error(`Save progress failed (${key}):`, error)
    return false
  }
}

/**
 * 加载进度数据
 * @param {string} key - 进度键名
 * @returns {Object|null}
 */
export const loadProgress = (key) => {
  try {
    if (!Object.values(PROGRESS_KEYS).includes(key)) {
      console.warn(`Invalid progress key: ${key}`)
      return null
    }

    const data = safeGetItem(key)
    if (!data) return null

    // 验证数据完整性
    if (!validateProgressData(data)) {
      console.log(`Progress data invalid or expired: ${key}`)
      safeRemoveItem(key)
      return null
    }

    return data
  } catch (error) {
    console.error(`Load progress failed (${key}):`, error)
    return null
  }
}

/**
 * 清除指定进度
 * @param {string} key - 进度键名
 * @returns {boolean}
 */
export const clearProgress = (key) => {
  try {
    if (!Object.values(PROGRESS_KEYS).includes(key)) {
      console.warn(`Invalid progress key: ${key}`)
      return false
    }
    return safeRemoveItem(key)
  } catch (error) {
    console.error(`Clear progress failed (${key}):`, error)
    return false
  }
}

/**
 * 检查是否有可恢复的进度
 * @param {string} key - 进度键名
 * @returns {boolean}
 */
export const hasProgress = (key) => {
  return loadProgress(key) !== null
}

/**
 * 获取所有有效进度
 * @returns {Object}
 */
export const getAllProgress = () => {
  const progress = {}
  Object.values(PROGRESS_KEYS).forEach((key) => {
    const data = loadProgress(key)
    if (data) {
      progress[key] = data
    }
  })
  return progress
}

/**
 * 清除所有进度
 * @returns {boolean}
 */
export const clearAllProgress = () => {
  try {
    let success = true
    Object.values(PROGRESS_KEYS).forEach((key) => {
      if (!clearProgress(key)) {
        success = false
      }
    })
    return success
  } catch (error) {
    console.error('Clear all progress failed:', error)
    return false
  }
}

/**
 * 获取进度统计信息
 * @returns {Object}
 */
export const getProgressStats = () => {
  const stats = {
    total: 0,
    completed: 0,
    accuracy: 0,
    timeSpent: 0,
    oldestProgress: null,
    newestProgress: null,
  }

  const allProgress = getAllProgress()
  const timestamps = []

  Object.values(allProgress).forEach((data) => {
    stats.total++
    if (data.isComplete) stats.completed++
    if (data.accuracy) stats.accuracy += data.accuracy
    if (data.timeSpent) stats.timeSpent += data.timeSpent
    timestamps.push(data.timestamp)
  })

  if (stats.total > 0) {
    stats.accuracy = Math.round(stats.accuracy / stats.total)
    stats.oldestProgress = Math.min(...timestamps)
    stats.newestProgress = Math.max(...timestamps)
  }

  return stats
}

/**
 * 导出进度到文件
 * @returns {boolean}
 */
export const exportProgress = () => {
  try {
    const allProgress = getAllProgress()
    const exportData = {
      version: '2.0',
      exportTime: Date.now(),
      progress: allProgress,
      stats: getProgressStats(),
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

    const exportFileDefaultName = `ziyuan_progress_${new Date().toISOString().split('T')[0]}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()

    console.log('Progress exported successfully')
    return true
  } catch (error) {
    console.error('Export progress failed:', error)
    return false
  }
}

/**
 * 从文件导入进度
 * @param {File} file - 进度文件
 * @returns {Promise<boolean>}
 */
export const importProgress = (file) => {
  return new Promise((resolve, reject) => {
    try {
      if (!file || typeof file.text !== 'function') {
        reject(new Error('Invalid file object'))
        return
      }

      file
        .text()
        .then((fileContent) => {
          try {
            const importedData = JSON.parse(fileContent)

            // 验证导入的数据结构
            if (!importedData.progress || typeof importedData.progress !== 'object') {
              throw new Error('Invalid progress file format')
            }

            // 保存导入的进度
            let importCount = 0
            Object.entries(importedData.progress).forEach(([key, data]) => {
              if (Object.values(PROGRESS_KEYS).includes(key)) {
                if (saveProgress(key, data)) {
                  importCount++
                }
              }
            })

            console.log(`Imported ${importCount} progress items successfully`)
            resolve(true)
          } catch (parseError) {
            console.error('Parse progress file failed:', parseError)
            reject(parseError)
          }
        })
        .catch((readError) => {
          console.error('Read file failed:', readError)
          reject(readError)
        })
    } catch (error) {
      console.error('Import progress failed:', error)
      reject(error)
    }
  })
}

/**
 * 清理过期进度数据
 * @returns {number} 清理的项目数量
 */
export const cleanupExpiredProgress = () => {
  let cleanedCount = 0
  Object.values(PROGRESS_KEYS).forEach((key) => {
    const data = safeGetItem(key)
    if (data && !validateProgressData(data)) {
      safeRemoveItem(key)
      cleanedCount++
    }
  })
  return cleanedCount
}

// 默认导出所有功能
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
  cleanupExpiredProgress,
}
