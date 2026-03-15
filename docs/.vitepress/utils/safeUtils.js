/**
 * 安全工具函数 - 提供健壮的通用工具函数
 * 包括防抖、节流、类型检查、边界处理等
 */

/**
 * 防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function}
 */
export const debounce = (func, wait = 300, immediate = false) => {
  let timeout
  let lastCallTime = 0

  return function executedFunction(...args) {
    const now = Date.now()
    const context = this

    // 清除之前的定时器
    clearTimeout(timeout)

    if (immediate) {
      // 如果距离上次调用已经超过 wait 时间，立即执行
      if (now - lastCallTime >= wait) {
        lastCallTime = now
        func.apply(context, args)
      } else {
        // 否则设置定时器
        timeout = setTimeout(() => {
          lastCallTime = Date.now()
          func.apply(context, args)
        }, wait)
      }
    } else {
      // 非立即执行模式
      timeout = setTimeout(() => {
        func.apply(context, args)
      }, wait)
    }
  }
}

/**
 * 节流函数
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function}
 */
export const throttle = (func, limit = 300) => {
  let inThrottle = false
  let lastFunc
  let lastRan

  return function executedFunction(...args) {
    const context = this

    if (!inThrottle) {
      func.apply(context, args)
      lastRan = Date.now()
      inThrottle = true

      setTimeout(() => {
        inThrottle = false
        // 如果有积攒的调用，执行最后一次
        if (lastFunc) {
          lastFunc()
          lastFunc = null
        }
      }, limit)
    } else {
      // 保存最后一次调用
      lastFunc = () => func.apply(context, args)
    }
  }
}

/**
 * 安全地解析数字
 * @param {*} value - 要解析的值
 * @param {number} defaultValue - 默认值
 * @returns {number}
 */
export const safeParseNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue
  const parsed = Number(value)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * 安全地解析整数
 * @param {*} value - 要解析的值
 * @param {number} defaultValue - 默认值
 * @returns {number}
 */
export const safeParseInt = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * 安全地获取数组元素
 * @param {Array} array - 数组
 * @param {number} index - 索引
 * @param {*} defaultValue - 默认值
 * @returns {*}
 */
export const safeGetArrayItem = (array, index, defaultValue = null) => {
  if (!Array.isArray(array)) return defaultValue
  if (index < 0 || index >= array.length) return defaultValue
  return array[index] ?? defaultValue
}

/**
 * 检查值是否为有效的非空字符串
 * @param {*} value - 要检查的值
 * @returns {boolean}
 */
export const isValidString = (value) => {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * 安全地获取对象属性
 * @param {Object} obj - 对象
 * @param {string} path - 属性路径（支持点号分隔）
 * @param {*} defaultValue - 默认值
 * @returns {*}
 */
export const safeGet = (obj, path, defaultValue = null) => {
  if (!obj || typeof obj !== 'object') return defaultValue

  const keys = path.split('.')
  let result = obj

  for (const key of keys) {
    if (result === null || result === undefined || typeof result !== 'object') {
      return defaultValue
    }
    result = result[key]
  }

  return result ?? defaultValue
}

/**
 * 格式化时间（秒数转为 mm:ss）
 * @param {number} seconds - 秒数
 * @returns {string}
 */
export const formatTime = (seconds) => {
  const safeSeconds = safeParseInt(seconds, 0)
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * 计算百分比
 * @param {number} part - 部分值
 * @param {number} total - 总值
 * @param {number} decimals - 小数位数
 * @returns {number}
 */
export const calculatePercentage = (part, total, decimals = 0) => {
  const safePart = safeParseNumber(part, 0)
  const safeTotal = safeParseNumber(total, 0)

  if (safeTotal === 0) return 0

  const percentage = (safePart / safeTotal) * 100
  const multiplier = Math.pow(10, decimals)
  return Math.round(percentage * multiplier) / multiplier
}

/**
 * Fisher-Yates 洗牌算法
 * @param {Array} array - 要洗牌的数组
 * @returns {Array}
 */
export const shuffleArray = (array) => {
  if (!Array.isArray(array) || array.length === 0) return []

  const newArray = [...array]

  // 使用更现代的实现，但保持兼容性
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    // 使用临时变量交换，兼容性更好
    const temp = newArray[i]
    newArray[i] = newArray[j]
    newArray[j] = temp
  }

  return newArray
}

/**
 * 生成唯一 ID
 * @returns {string}
 */
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 检查是否为 Touch 设备
 * @returns {boolean}
 */
export const isTouchDevice = () => {
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  )
}

/**
 * 检查是否支持特定 CSS 特性
 * @param {string} property - CSS 属性名
 * @returns {boolean}
 */
export const supportsCSS = (property) => {
  return CSS?.supports?.(property) || false
}

/**
 * 检查用户是否偏好减少动画
 * @returns {boolean}
 */
export const prefersReducedMotion = () => {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

/**
 * 安全地聚焦元素
 * @param {HTMLElement} element - 要聚焦的元素
 * @param {number} delay - 延迟时间（毫秒）
 */
export const safeFocus = (element, delay = 0) => {
  if (!element || typeof element.focus !== 'function') return

  const focusElement = () => {
    try {
      element.focus()
    } catch (error) {
      console.warn('Failed to focus element:', error)
    }
  }

  if (delay > 0) {
    setTimeout(focusElement, delay)
  } else {
    // 使用 requestAnimationFrame 确保 DOM 已更新
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(focusElement)
    } else {
      setTimeout(focusElement, 0)
    }
  }
}

/**
 * 安全地移除事件监听器
 * @param {EventTarget} target - 事件目标
 * @param {string} event - 事件名
 * @param {Function} handler - 事件处理器
 * @param {Object} options - 选项
 */
export const safeRemoveEventListener = (target, event, handler, options = {}) => {
  if (!target || typeof target.removeEventListener !== 'function') return
  try {
    target.removeEventListener(event, handler, options)
  } catch (error) {
    console.warn(`Failed to remove event listener for "${event}":`, error)
  }
}

/**
 * 深拷贝对象（简单版本）
 * @param {*} obj - 要拷贝的对象
 * @returns {*}
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (Array.isArray(obj)) return obj.map(deepClone)

  const cloned = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key])
    }
  }
  return cloned
}

/**
 * 截断字符串
 * @param {string} str - 字符串
 * @param {number} maxLength - 最大长度
 * @param {string} suffix - 后缀
 * @returns {string}
 */
export const truncateString = (str, maxLength = 100, suffix = '...') => {
  if (!isValidString(str)) return ''
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - suffix.length) + suffix
}
