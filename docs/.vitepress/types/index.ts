/**
 * 字源输入法项目 - TypeScript 类型定义
 * 提供项目中使用的所有类型接口和类型别名
 */

/**
 * 字根数据结构
 */
export interface Root {
  /** 字根字符 */
  character: string
  /** 字根编码 */
  code: string
  /** 提示信息 */
  hint: string
  /** 字根分类（可选） */
  category?: string
  /** 笔顺（可选） */
  strokeOrder?: string[]
  /** 示例汉字（可选） */
  examples?: string[]
}

/**
 * 练习模式
 */
export type PracticeMode = 'order' | 'shuffle'

/**
 * 进度数据结构
 */
export interface ProgressData {
  /** 练习模式 */
  mode: PracticeMode
  /** 正确回答数量 */
  correctCount: number
  /** 已回答的字根数量 */
  answeredRoots: number
  /** 练习的字根数组 */
  practiceRoots: Root[]
  /** 是否完成练习 */
  isComplete: boolean
  /** 保存时间戳 */
  timestamp: string
  /** 数据版本 */
  version: string
}

/**
 * 十字练习进度
 */
export interface CrossPracticeProgress {
  /** 已完成的组数 */
  completedGroups: number
  /** 当前组索引 */
  currentGroup: number
  /** 当前组已练习的遍数 */
  groupRepetitions: number
  /** 最后完成时间 */
  lastCompletedTime?: string
}

/**
 * 十字练习状态
 */
export interface CrossPracticeState {
  /** 是否启用十字练习 */
  isCrossPractice: boolean
  /** 练习模式 */
  practiceMode: PracticeMode
  /** 当前组索引 */
  currentGroup: number
  /** 当前组已练习的遍数 */
  groupRepetitions: number
  /** 已完成的组数 */
  completedGroups: number
}

/**
 * 存储信息
 */
export interface StorageInfo {
  /** 已使用空间（字节） */
  used: number
  /** 总空间（字节） */
  total: number
  /** 使用百分比 */
  percentage: string
  /** 存储的键列表 */
  keys: string[]
  /** 错误标记 */
  error?: boolean
}

/**
 * 图片缩放组件属性
 */
export interface ImageZoomProps {
  /** 图片路径 */
  src: string
  /** 替代文本 */
  alt?: string
  /** 说明文字 */
  caption?: string
  /** 最大宽度 */
  maxWidth?: string
  /** 最大高度 */
  maxHeight?: string
}

/**
 * 练习统计信息
 */
export interface PracticeStats {
  /** 总字根数 */
  totalRoots: number
  /** 已完成数量 */
  completedCount: number
  /** 正确率 */
  accuracy: number
  /** 练习进度文本 */
  progress: string
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否正确 */
  isCorrect: boolean
  /** 用户输入 */
  userInput: string
  /** 正确答案 */
  correctAnswer: string
  /** 错误信息（如果不正确） */
  errorMessage?: string
}

/**
 * 字根查询结果
 */
export interface RootQueryResult {
  /** 是否找到 */
  found: boolean
  /** 字根数据 */
  root?: Root
  /** 错误信息（如果没找到） */
  error?: string
}

/**
 * 练习配置
 */
export interface PracticeConfig {
  /** 是否启用十字练习 */
  enableCrossPractice: boolean
  /** 十字练习每组大小 */
  groupSize: number
  /** 十字练习每组重复次数 */
  groupRepetitions: number
  /** 提示显示时长（毫秒） */
  feedbackDisplayTime: number
  /** 是否自动保存进度 */
  autoSave: boolean
}

/**
 * 默认练习配置
 */
export const DEFAULT_PRACTICE_CONFIG: PracticeConfig = {
  enableCrossPractice: false,
  groupSize: 10,
  groupRepetitions: 3,
  feedbackDisplayTime: 1500,
  autoSave: true
}

/**
 * 练习事件类型
 */
export type PracticeEventType =
  | 'practice_start'
  | 'practice_complete'
  | 'answer_correct'
  | 'answer_wrong'
  | 'mode_change'
  | 'progress_saved'
  | 'progress_loaded'

/**
 * 练习事件数据
 */
export interface PracticeEvent {
  /** 事件类型 */
  type: PracticeEventType
  /** 事件时间戳 */
  timestamp: number
  /** 事件数据 */
  data?: any
}

/**
 * 分类后的字根
 */
export interface CategorizedRoots {
  /** 分类名称 */
  category: string
  /** 该分类的字根列表 */
  roots: Root[]
}

/**
 * 字根编码映射
 */
export type RootCodeMap = Map<string, Root>

/**
 * 字根分类映射
 */
export type RootCategoryMap = Map<string, Root[]>