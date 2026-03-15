/**
 * 统一字体加载器 - 解决字体检查重复问题
 * 提供字体可用性检测、加载状态管理和字体回退机制
 */

// 字体缓存
const fontCache = new Map()

// 常用中文字体列表
const CHINESE_FONTS = [
  'Noto Sans SC',
  'PingFang SC',
  'Microsoft YaHei',
  'SimHei',
  'SimSun',
  'Arial Unicode MS',
]

/**
 * 检查字体是否可用
 * @param {string} fontFamily - 字体名称
 * @returns {Promise<boolean>}
 */
export const isFontAvailable = (fontFamily) => {
  return new Promise((resolve) => {
    // 检查缓存
    if (fontCache.has(fontFamily)) {
      resolve(fontCache.get(fontFamily))
      return
    }

    // 创建测试元素
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    // 测试文本
    const testText = '字体测试'
    const fallbackFont = 'monospace'

    // 获取默认字体的宽度
    context.font = `72px ${fallbackFont}`
    const fallbackWidth = context.measureText(testText).width

    // 测试目标字体
    context.font = `72px "${fontFamily}", ${fallbackFont}`
    const targetWidth = context.measureText(testText).width

    // 如果宽度不同，说明字体可用
    const isAvailable = fallbackWidth !== targetWidth

    // 缓存结果
    fontCache.set(fontFamily, isAvailable)

    resolve(isAvailable)
  })
}

/**
 * 检查字符是否可以正确显示
 * @param {string} char - 要检查的字符
 * @param {string} fontFamily - 字体名称（可选）
 * @returns {Promise<boolean>}
 */
export const canDisplayCharacter = async (char, fontFamily = 'Noto Sans SC') => {
  try {
    // 检查字体是否可用
    const fontAvailable = await isFontAvailable(fontFamily)
    if (!fontAvailable) {
      return false
    }

    // 创建测试元素
    const testElement = document.createElement('span')
    testElement.style.position = 'absolute'
    testElement.style.visibility = 'hidden'
    testElement.style.fontSize = '72px'
    testElement.style.fontFamily = `"${fontFamily}", monospace`
    testElement.textContent = char

    document.body.appendChild(testElement)

    // 检查字符是否渲染为占位符
    const computedStyle = window.getComputedStyle(testElement)
    const isPlaceholder = computedStyle.fontFamily.includes('monospace')

    document.body.removeChild(testElement)

    return !isPlaceholder
  } catch (error) {
    console.warn('Character display check failed:', error)
    return false
  }
}

/**
 * 检查是否为特殊字符
 * @param {string} char - 字符
 * @returns {boolean}
 */
export const isSpecialCharacter = (char) => {
  // 检查是否为扩展汉字区、生僻字等
  const code = char.charCodeAt(0)

  // 基本汉字范围之外的字符
  if (code > 0x9fff) {
    return true
  }

  // 特殊符号区
  if (
    (code >= 0x2000 && code <= 0x2fff) ||
    (code >= 0x3000 && code <= 0x303f) ||
    (code >= 0xff00 && code <= 0xffef)
  ) {
    return true
  }

  return false
}

/**
 * 获取最佳可用字体
 * @returns {Promise<string>}
 */
export const getBestAvailableFont = async () => {
  for (const font of CHINESE_FONTS) {
    if (await isFontAvailable(font)) {
      return font
    }
  }
  return 'serif' // 最终回退
}

/**
 * 预加载字体
 * @param {string} fontFamily - 字体名称
 * @returns {Promise<void>}
 */
export const preloadFont = (fontFamily) => {
  return new Promise((resolve, reject) => {
    const font = new FontFace(fontFamily, `url(/fonts/${fontFamily.replace(/\s+/g, '_')}.woff2)`)

    font
      .load()
      .then(() => {
        document.fonts.add(font)
        fontCache.set(fontFamily, true)
        resolve()
      })
      .catch((error) => {
        fontCache.set(fontFamily, false)
        reject(error)
      })
  })
}

/**
 * 初始化字体系统
 * @returns {Promise<string>} 最佳可用字体
 */
export const initializeFontSystem = async () => {
  try {
    // 检查系统字体
    const bestFont = await getBestAvailableFont()

    // 设置 CSS 变量
    document.documentElement.style.setProperty('--best-chinese-font', `"${bestFont}"`)

    console.log(`Font system initialized with: ${bestFont}`)
    return bestFont
  } catch (error) {
    console.error('Font system initialization failed:', error)
    return 'serif'
  }
}

/**
 * 字体加载状态管理
 */
export class FontManager {
  constructor() {
    this.loadedFonts = new Set()
    this.loadingFonts = new Set()
    this.failedFonts = new Set()
  }

  /**
   * 加载字体
   * @param {string} fontFamily - 字体名称
   * @returns {Promise<boolean>}
   */
  async loadFont(fontFamily) {
    if (this.loadedFonts.has(fontFamily)) {
      return true
    }

    if (this.loadingFonts.has(fontFamily)) {
      // 等待加载完成
      while (this.loadingFonts.has(fontFamily)) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      return this.loadedFonts.has(fontFamily)
    }

    this.loadingFonts.add(fontFamily)

    try {
      const isAvailable = await isFontAvailable(fontFamily)
      if (isAvailable) {
        this.loadedFonts.add(fontFamily)
        return true
      } else {
        this.failedFonts.add(fontFamily)
        return false
      }
    } catch (error) {
      this.failedFonts.add(fontFamily)
      console.error(`Font loading failed for ${fontFamily}:`, error)
      return false
    } finally {
      this.loadingFonts.delete(fontFamily)
    }
  }

  /**
   * 获取加载状态
   * @param {string} fontFamily - 字体名称
   * @returns {string} 'loading' | 'loaded' | 'failed' | 'unknown'
   */
  getFontStatus(fontFamily) {
    if (this.loadingFonts.has(fontFamily)) return 'loading'
    if (this.loadedFonts.has(fontFamily)) return 'loaded'
    if (this.failedFonts.has(fontFamily)) return 'failed'
    return 'unknown'
  }

  /**
   * 获取所有已加载字体
   * @returns {string[]}
   */
  getLoadedFonts() {
    return Array.from(this.loadedFonts)
  }
}

// 创建全局字体管理器实例
export const fontManager = new FontManager()

// 默认导出
export default {
  isFontAvailable,
  canDisplayCharacter,
  isSpecialCharacter,
  getBestAvailableFont,
  preloadFont,
  initializeFontSystem,
  fontManager,
}
