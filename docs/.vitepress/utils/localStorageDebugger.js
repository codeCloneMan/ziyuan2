/**
 * localStorage调试工具
 * 用于实时监控和调试进度相关的localStorage操作
 */

// 进度相关的键列表
const PROGRESS_KEYS = [
  'order_progress',
  'random_progress',
  'top500_progress',
  'error_progress',
  'practice_progress',
  'rootPracticeProgress', // 全局进度管理器使用的键
]

// 调试日志存储
let debugLogs = []

/**
 * 记录localStorage操作
 */
export const logStorageOperation = (operation, key, data, component) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation, // 'GET', 'SET', 'REMOVE', 'CLEAR'
    key,
    component,
    dataSize: data ? JSON.stringify(data).length : 0,
    dataPreview: data
      ? {
          progress: data.progress,
          totalAttempts: data.totalAttempts,
          answeredRoots: data.answeredRoots,
          isComplete: data.isComplete,
          mode: data.mode,
        }
      : null,
  }

  debugLogs.push(logEntry)

  // 只保留最近100条日志
  if (debugLogs.length > 100) {
    debugLogs = debugLogs.slice(-100)
  }

  console.log('🔍 STORAGE_LOG:', logEntry)
}

/**
 * 获取所有进度相关的数据
 */
export const getAllProgressData = () => {
  const result = {}

  PROGRESS_KEYS.forEach((key) => {
    const data = localStorage.getItem(key)
    if (data) {
      try {
        result[key] = {
          raw: data,
          parsed: JSON.parse(data),
          size: data.length,
          lastModified: new Date().toISOString(), // localStorage不提供修改时间
        }
      } catch (e) {
        result[key] = {
          raw: data,
          parsed: null,
          error: 'Invalid JSON',
          size: data.length,
        }
      }
    } else {
      result[key] = null
    }
  })

  return result
}

/**
 * 显示当前localStorage状态
 */
export const showStorageStatus = () => {
  console.log('📊 === LOCALSTORAGE STATUS ===')
  const allData = getAllProgressData()

  Object.entries(allData).forEach(([key, value]) => {
    if (value) {
      console.log(`📦 ${key}:`, {
        size: value.size,
        hasData: !!value.parsed,
        progress: value.parsed?.progress || 'N/A',
        mode: value.parsed?.mode || 'N/A',
        isComplete: value.parsed?.isComplete || false,
      })
    } else {
      console.log(`📦 ${key}: null`)
    }
  })

  console.log('📊 === END STATUS ===')
}

/**
 * 获取调试日志
 */
export const getDebugLogs = () => {
  return [...debugLogs]
}

/**
 * 清除调试日志
 */
export const clearDebugLogs = () => {
  debugLogs = []
}

/**
 * 监控localStorage变化（如果可能的话）
 */
export const startStorageMonitoring = () => {
  // 重写localStorage方法来监控操作
  const originalSetItem = localStorage.setItem
  const originalGetItem = localStorage.getItem
  const originalRemoveItem = localStorage.removeItem

  localStorage.setItem = function (key, value) {
    if (PROGRESS_KEYS.includes(key)) {
      let parsedValue
      try {
        parsedValue = JSON.parse(value)
      } catch (e) {
        parsedValue = value
      }
      logStorageOperation('SET', key, parsedValue, 'Unknown')
    }
    return originalSetItem.call(this, key, value)
  }

  localStorage.getItem = function (key) {
    const result = originalGetItem.call(this, key)
    if (PROGRESS_KEYS.includes(key) && result) {
      try {
        const parsed = JSON.parse(result)
        logStorageOperation('GET', key, parsed, 'Unknown')
      } catch (e) {
        logStorageOperation('GET', key, result, 'Unknown')
      }
    }
    return result
  }

  localStorage.removeItem = function (key) {
    if (PROGRESS_KEYS.includes(key)) {
      logStorageOperation('REMOVE', key, null, 'Unknown')
    }
    return originalRemoveItem.call(this, key)
  }

  console.log('🔍 Storage monitoring started')
}

// 自动启动监控
if (typeof window !== 'undefined') {
  startStorageMonitoring()
}
