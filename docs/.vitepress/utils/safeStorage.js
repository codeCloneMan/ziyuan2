/**
 * 安全存储工具 - 提供 localStorage 的健壮封装
 * 处理 Safari 隐私模式、存储配额超限、JSON 解析错误等边界情况
 */

const STORAGE_PREFIX = 'ziyuan_practice_'

/**
 * 检查 localStorage 是否可用
 * @returns {boolean}
 */
export const isStorageAvailable = () => {
  try {
    const testKey = '__storage_test__'
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
    return true
  } catch (e) {
    return false
  }
}

/**
 * 安全地获取存储项
 * @param {string} key - 存储键名
 * @param {*} defaultValue - 默认值
 * @returns {*}
 */
export const safeGetItem = (key, defaultValue = null) => {
  try {
    if (!isStorageAvailable()) return defaultValue
    const fullKey = STORAGE_PREFIX + key
    const item = localStorage.getItem(fullKey)
    if (item === null) return defaultValue
    return JSON.parse(item)
  } catch (error) {
    console.warn(`Failed to get item "${key}":`, error)
    return defaultValue
  }
}

/**
 * 安全地设置存储项
 * @param {string} key - 存储键名
 * @param {*} value - 存储值
 * @returns {boolean}
 */
export const safeSetItem = (key, value) => {
  try {
    if (!isStorageAvailable()) return false
    const fullKey = STORAGE_PREFIX + key
    const serialized = JSON.stringify(value)
    localStorage.setItem(fullKey, serialized)
    return true
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.warn(`Storage quota exceeded for key "${key}"`)
    } else {
      console.warn(`Failed to set item "${key}":`, error)
    }
    return false
  }
}

/**
 * 安全地移除存储项
 * @param {string} key - 存储键名
 * @returns {boolean}
 */
export const safeRemoveItem = (key) => {
  try {
    if (!isStorageAvailable()) return false
    const fullKey = STORAGE_PREFIX + key
    localStorage.removeItem(fullKey)
    return true
  } catch (error) {
    console.warn(`Failed to remove item "${key}":`, error)
    return false
  }
}

/**
 * 获取所有带前缀的键
 * @returns {string[]}
 */
export const getAllKeys = () => {
  try {
    if (!isStorageAvailable()) return []
    return Object.keys(localStorage).filter((key) => key.startsWith(STORAGE_PREFIX))
  } catch (error) {
    console.warn('Failed to get all keys:', error)
    return []
  }
}

/**
 * 清空所有练习相关的存储
 * @returns {boolean}
 */
export const clearAllPracticeStorage = () => {
  try {
    if (!isStorageAvailable()) return false
    const keys = getAllKeys()
    keys.forEach((key) => {
      try {
        localStorage.removeItem(key)
      } catch (e) {
        console.warn(`Failed to remove "${key}":`, e)
      }
    })
    return true
  } catch (error) {
    console.warn('Failed to clear practice storage:', error)
    return false
  }
}

/**
 * 获取存储使用情况（估计）
 * @returns {{used: number, total: number, available: number, percent: number}}
 */
export const getStorageUsage = () => {
  try {
    if (!isStorageAvailable()) {
      return { used: 0, total: 0, available: 0, percent: 0 }
    }

    let used = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      const value = localStorage.getItem(key)
      used += key.length + value.length
    }

    // localStorage 通常限制为 5-10MB
    const total = 5 * 1024 * 1024 // 5MB 估计值
    const available = Math.max(0, total - used)
    const percent = Math.min(100, Math.round((used / total) * 100))

    return { used, total, available, percent }
  } catch (error) {
    console.warn('Failed to get storage usage:', error)
    return { used: 0, total: 0, available: 0, percent: 0 }
  }
}
