/**
 * 字体检查工具
 * 用于检测字符是否可以正确显示
 */

/**
 * 检测字符是否可以显示
 * @param {string} char - 要检测的字符
 * @param {string} fontFamily - 字体家族
 * @returns {boolean} - 字符是否可以显示
 */
export function canDisplayCharacter(char, fontFamily = 'sans-serif') {
  // 创建测试元素
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  // 设置字体
  ctx.font = `20px ${fontFamily}`

  // 测量字符
  const metrics = ctx.measureText(char)

  // 检查字符是否有有效的度量值
  // 如果字符不能显示，通常宽度为0或者非常小
  return metrics.width > 0
}

/**
 * 检测字符是否是特殊字符
 * @param {string} char - 要检测的字符
 * @returns {boolean} - 是否是特殊字符
 */
export function isSpecialCharacter(char) {
  const code = char.charCodeAt(0)

  // 检查是否是扩展字符区域
  // E000-F8FF: 私用区（Private Use Area）- 这些字符通常无法显示
  // F000-FFFF: 私用区扩展 - 这些字符通常无法显示
  // 注意：F900-FAFF 是 CJK 兼容表意文字，不属于私用区
  return (code >= 0xe000 && code <= 0xf8ff) || (code >= 0xf000 && code <= 0xffff)
}

/**
 * 获取字符的备用显示内容
 * @param {string} char - 原始字符
 * @param {string} hint - 提示信息
 * @returns {object} - 显示信息对象
 */
export function getFallbackDisplay(char, hint) {
  return {
    char: char,
    isSpecial: isSpecialCharacter(char),
    canDisplay: canDisplayCharacter(char),
    hint: hint,
    // 如果是特殊字符，可以添加额外的标识
    showFallback: isSpecialCharacter(char) && !canDisplayCharacter(char),
  }
}

/**
 * 批量检查字符显示状态
 * @param {Array} items - 包含字符的项目数组
 * @returns {Map} - 字符显示状态映射
 */
export function checkCharacterDisplayStatus(items) {
  const statusMap = new Map()

  items.forEach((item) => {
    const char = item.character
    const status = getFallbackDisplay(char, item.hint)
    statusMap.set(char, status)
  })

  return statusMap
}

/**
 * 创建字符的SVG占位符
 * @param {string} char - 字符
 * @param {string} code - 编码
 * @returns {string} - SVG字符串
 */
export function createCharacterPlaceholder(char, code) {
  const charCode = char.charCodeAt(0).toString(16).toUpperCase()

  return `
    <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" fill="#f3f4f6" rx="8"/>
      <text x="60" y="55" font-family="monospace" font-size="16" fill="#6b7280" text-anchor="middle">
        U+${charCode}
      </text>
      <text x="60" y="80" font-family="sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle">
        ${code.toUpperCase()}
      </text>
    </svg>
  `
}
