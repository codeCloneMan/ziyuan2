/**
 * 进度管理测试工具
 * 用于验证进度隔离和安全性
 */

// 模拟测试数据
const testData = {
  order_progress: { progress: 0.25, totalAttempts: 10, answeredRoots: 5 },
  random_progress: { progress: 0.15, totalAttempts: 8, answeredRoots: 3 },
  top500_progress: { progress: 0.8, totalAttempts: 50, answeredRoots: 40 },
  error_progress: { progress: 0.3, totalAttempts: 12, answeredRoots: 6 },
  rootPracticeProgress: { correctCount: 7, answeredRoots: 7, mode: 'order' },
}

/**
 * 设置测试数据
 */
export const setupTestData = () => {
  console.log('🧪 设置测试数据...')
  Object.entries(testData).forEach(([key, data]) => {
    localStorage.setItem(key, JSON.stringify({ ...data, timestamp: Date.now() }))
    console.log(`✅ 设置 ${key}`)
  })
}

/**
 * 显示所有进度数据
 */
export const showAllProgress = () => {
  console.log('📊 === 当前所有进度数据 ===')
  const allKeys = [
    'order_progress',
    'random_progress',
    'top500_progress',
    'error_progress',
    'rootPracticeProgress',
  ]

  allKeys.forEach((key) => {
    const data = localStorage.getItem(key)
    if (data) {
      try {
        const parsed = JSON.parse(data)
        console.log(`📦 ${key}:`, {
          progress: parsed.progress || parsed.correctCount || 'N/A',
          totalAttempts: parsed.totalAttempts || 'N/A',
          answeredRoots: parsed.answeredRoots || 'N/A',
          mode: parsed.mode || 'N/A',
        })
      } catch (e) {
        console.log(`📦 ${key}: 无效数据`)
      }
    } else {
      console.log(`📦 ${key}: null`)
    }
  })
  console.log('📊 === 数据显示结束 ===')
}

/**
 * 测试progressManager.js的安全性
 */
export const testProgressManagerSafety = () => {
  console.log('🔒 测试progressManager.js安全性...')

  // 保存当前数据
  const beforeData = {}
  Object.keys(testData).forEach((key) => {
    beforeData[key] = localStorage.getItem(key)
  })

  try {
    // 模拟保存失败的情况
    const originalSetItem = localStorage.setItem
    localStorage.setItem = function (key, value) {
      if (key === 'rootPracticeProgress') {
        throw new Error('模拟保存失败')
      }
      return originalSetItem.call(this, key, value)
    }

    // 导入并测试progressManager
    import('./progressManager.js').then(({ saveProgress }) => {
      saveProgress('order', 5, 5, [], false)

      // 恢复原始setItem
      localStorage.setItem = originalSetItem

      // 检查其他数据是否受影响
      let otherDataAffected = false
      Object.keys(beforeData).forEach((key) => {
        if (key !== 'rootPracticeProgress') {
          const current = localStorage.getItem(key)
          if (current !== beforeData[key]) {
            otherDataAffected = true
            console.log(`❌ ${key} 被意外影响!`)
          }
        }
      })

      if (!otherDataAffected) {
        console.log('✅ progressManager.js 安全性测试通过')
      } else {
        console.log('❌ progressManager.js 存在安全问题')
      }
    })
  } catch (error) {
    console.error('测试失败:', error)
  }
}

/**
 * 清理测试数据
 */
export const cleanupTestData = () => {
  console.log('🧹 清理测试数据...')
  Object.keys(testData).forEach((key) => {
    localStorage.removeItem(key)
  })
  console.log('✅ 测试数据已清理')
}

/**
 * 运行完整测试套件
 */
export const runFullTest = () => {
  console.log('🚀 开始完整进度管理测试...')

  setupTestData()
  showAllProgress()
  testProgressManagerSafety()

  setTimeout(() => {
    showAllProgress()
    cleanupTestData()
    console.log('🎉 测试完成!')
  }, 1000)
}
