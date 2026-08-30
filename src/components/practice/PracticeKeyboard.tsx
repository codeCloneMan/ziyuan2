import { useState, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { keyboardRows, keyRootsMap } from '@/data/roots';
import type { RootMapping } from '@/data/roots';
import { Keyboard, Delete } from 'lucide-react';

// ====== 触觉反馈（移动端振动） ======
function hapticFeedback(type: 'tap' | 'correct' | 'wrong') {
  if (!navigator.vibrate) return;
  switch (type) {
    case 'tap': navigator.vibrate(10); break;
    case 'correct': navigator.vibrate([15, 30, 15]); break;
    case 'wrong': navigator.vibrate([50, 30, 50]); break;
  }
}

// ====== 字根键盘的显示模式 ======
export type KeyboardDisplayMode = 'roots' | 'codes' | 'blank';

const KEY_COLORS: Record<string, string> = {
  correct: 'bg-emerald-500 text-white border-emerald-600',
  wrong: 'bg-red-500 text-white border-red-600',
  highlight: 'bg-amber-400 text-white border-amber-500 animate-pulse',
  default: 'bg-card text-foreground border-border/60 hover:bg-secondary/40',
};

export interface PracticeKeyboardProps {
  /** 键盘模式：roots=字根练习（显示字根/可切换），codes=整字/词组编码输入 */
  mode: 'roots' | 'codes';
  /** 当前反馈类型（用于按键着色） */
  feedbackType: 'correct' | 'wrong' | null;
  /** 当前反馈高亮的键 */
  keyFeedback: string | null;
  onKeyPress: (key: string) => void;
  /** 是否正在练习（roots 模式下用于控制点击交互） */
  isPlaying?: boolean;
  // ===== roots 模式专属 =====
  currentRoot?: RootMapping;
  /** 每个键上字根的掌握状态（char -> correctCount），用于淡化已掌握键 */
  correctCountMap?: Record<string, number>;
  // ===== codes 模式专属 =====
  onBackspace?: () => void;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
}

/**
 * 统一的练习键盘。由原先的 VirtualKeyboard(字根) 与 CodeKeyboard(编码) 合并而来，
 * 共享同一套键盘布局、触觉反馈与反馈着色逻辑，仅按 mode 切换显示细节，
 * 避免两套近似组件带来的维护分叉与出错面。
 */
export default function PracticeKeyboard({
  mode,
  feedbackType,
  keyFeedback,
  onKeyPress,
  isPlaying = false,
  currentRoot,
  correctCountMap,
  onBackspace,
  headerLeft,
  headerRight,
}: PracticeKeyboardProps) {
  // 键盘显示模式记忆：记住用户上次选择（字根/编码/空白），下次进入练习直接恢复
  const [displayMode, setDisplayMode] = useState<KeyboardDisplayMode>(() => {
    const saved = localStorage.getItem('ziyuan-keyboard-mode');
    return saved === 'roots' || saved === 'codes' || saved === 'blank' ? saved : 'roots';
  });
  const [selectedKeyInfo, setSelectedKeyInfo] = useState<string | null>(null);
  // 防止移动端 touch + click 双重触发
  const touchHandledRef = useRef<Set<string>>(new Set());

  const showRootsExtras = mode === 'roots';

  const handlePress = (key: string) => {
    if (touchHandledRef.current.has(key)) {
      touchHandledRef.current.delete(key);
      return;
    }
    hapticFeedback('tap');
    if (!showRootsExtras || !feedbackType) {
      // 编码模式 / 字根模式未判题时：直接触发按键
      if (!isPlaying || !feedbackType) onKeyPress(key);
    } else {
      // 字根模式且正在判题：点击展开该键字根详情
      setSelectedKeyInfo(selectedKeyInfo === key ? null : key);
    }
  };

  return (
    <div className={cn("sm:card-base p-1 sm:p-5", mode === 'codes' && "mt-2 sm:mt-4")}>
      {/* 顶部控制栏 */}
      <div className="flex items-center justify-between mb-1 sm:mb-2.5">
        {showRootsExtras ? (
          <>
            <div className="flex items-center gap-1.5">
              <Keyboard className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="text-[11px] font-medium text-muted-foreground/70" style={{ fontFamily: "'Noto Serif SC', serif" }}>字根键盘</span>
            </div>
            <div className="flex items-center gap-0.5">
              {(['roots', 'codes', 'blank'] as KeyboardDisplayMode[]).map(dm => (
                <button key={dm} onClick={() => { setDisplayMode(dm); localStorage.setItem('ziyuan-keyboard-mode', dm); }}
                  className={cn('px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors',
                    displayMode === dm ? 'bg-primary/10 text-primary' : 'text-muted-foreground/50 hover:text-foreground'
                  )}>
                  {dm === 'roots' ? '字根' : dm === 'codes' ? '编码' : '空白'}
                </button>
              ))}
            </div>
          </>
        ) : (
          (headerLeft || headerRight) && (
            <>
              <span className="text-[11px] font-medium text-muted-foreground/70" style={{ fontFamily: "'Noto Serif SC', serif" }}>{headerLeft}</span>
              {headerRight}
            </>
          )
        )}
      </div>

      {/* 键盘布局 */}
      <div className="mobile-keyboard flex flex-col items-center gap-[3px] sm:gap-1">
        {keyboardRows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-[3px] sm:gap-1 w-full" style={{ paddingLeft: `${rowIndex * 4}px` }}>
            {row.map((key) => {
              const isFeedback = keyFeedback === key;
              const isCorrectKey = showRootsExtras && currentRoot ? key === currentRoot.key : false;
              const rootsOnKey = keyRootsMap[key] || [];
              const isCurrentRootKey = isCorrectKey && !feedbackType;

              let colorClass = KEY_COLORS.default;
              if (isFeedback && feedbackType === 'correct') colorClass = KEY_COLORS.correct;
              else if (isFeedback && feedbackType === 'wrong') colorClass = KEY_COLORS.wrong;
              else if (showRootsExtras && feedbackType === 'wrong' && isCorrectKey) colorClass = KEY_COLORS.highlight;

              // 字根模式下：该键上所有字根均已掌握则淡化
              const keyMastered = showRootsExtras && correctCountMap
                ? rootsOnKey.every(r => (correctCountMap[r.char] || 0) >= 3)
                : false;

              return (
                <button key={key}
                  onClick={() => handlePress(key)}
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    // 顺序关键：先清残留标记 → 正常处理按键 → 再打标记，
                    // 让随后的合成 click 被 handlePress 的 has 检查跳过（防双重触发）。
                    // 若浏览器因 preventDefault 不派发合成 click，标记会残留，
                    // 因此下次 touch 必须先 delete，否则本次按键会被误吞。
                    touchHandledRef.current.delete(key);
                    handlePress(key);
                    touchHandledRef.current.add(key);
                  }}
                  className={cn(
                    "flex-1 min-w-0 flex flex-col items-center justify-center rounded-lg border transition-colors duration-150 cursor-pointer select-none relative",
                    "sm:flex-none sm:hover:shadow-sm sm:active:scale-95 sm:transition-all",
                    showRootsExtras ? "h-[50px] sm:h-14 sm:w-11" : "h-11 sm:h-10 sm:w-10 font-mono text-sm font-semibold",
                    colorClass,
                    showRootsExtras && keyMastered && !isCurrentRootKey && !isFeedback && 'opacity-50',
                  )}>
                  <span className={cn(showRootsExtras ? "text-[11px] sm:text-xs font-bold leading-none" : "")}>{key.toUpperCase()}</span>
                  {showRootsExtras && displayMode === 'roots' && (
                    <span className="text-[7px] sm:text-[9px] leading-tight text-center mt-0.5 line-clamp-2 text-muted-foreground/70 root-char">
                      {rootsOnKey.slice(0, 3).map(r => r.char).join('')}
                    </span>
                  )}
                  {showRootsExtras && displayMode === 'codes' && (
                    <span className="text-[7px] sm:text-[9px] font-mono text-muted-foreground/60 mt-0.5">
                      {rootsOnKey.length}根
                    </span>
                  )}
                  {/* 字根模式：点击键位展开详情 */}
                  {showRootsExtras && selectedKeyInfo === key && (
                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-20 w-36 sm:w-44 p-2 rounded-lg bg-popover border border-border/60 shadow-lg animate-fade-in">
                      <div className="text-[11px] font-medium text-foreground mb-1" style={{ fontFamily: "'Noto Serif SC', serif" }}>{key.toUpperCase()} 键字根</div>
                      <div className="flex flex-wrap gap-0.5">
                        {rootsOnKey.map(r => (
                          <span key={r.char} className={cn(
                            'px-1 py-0.5 rounded text-[10px]',
                            r.char === currentRoot?.char ? 'bg-amber-100/60 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-medium' : 'bg-muted/50 text-foreground/70'
                          )}>
                            {r.isPUA && r.desc ? r.desc : r.char}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
        {/* 编码模式：退格键行 */}
        {mode === 'codes' && onBackspace && (
          <div className="flex gap-[3px] sm:gap-1 w-full" style={{ paddingLeft: '12px' }}>
            <button onClick={() => { hapticFeedback('tap'); onBackspace(); }}
              onMouseDown={(e) => e.preventDefault()}
              className="flex-[2] min-w-0 h-11 sm:flex-none sm:h-10 sm:w-18 rounded-lg font-medium text-xs transition-all duration-150 border border-border/60 bg-card hover:bg-secondary/40 flex items-center justify-center gap-1">
              <Delete className="h-3 w-3" />
              <span className="text-[11px]" style={{ fontFamily: "'Noto Serif SC', serif" }}>删除</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
