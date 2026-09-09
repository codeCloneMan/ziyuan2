import { useState } from 'react';
import { cn } from '@/lib/utils';
import { rootImagePath } from '@/data/root-images';
import { CheckCircle2, XCircle, Lightbulb } from 'lucide-react';

interface RootDisplayCardProps {
  /** 题目：官方字根图文件名（public/roots/ 下） */
  imageFile: string;
  /** 本图的答案键位 */
  answerKey: string;
  /** 本图对应的可渲染字符（仅部分图能对应到码表字根；用于答错后的音托提示） */
  hintChar?: string;
  keyFeedback: string | null;
  feedbackType: 'correct' | 'wrong' | null;
  showHint: boolean;
  firstTimeHint: string | null;
  phoneticHint: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** 原生键盘（手机/桌面直接键入）输入回调 */
  onNativeInput?: (char: string) => void;
  /** 原生输入框聚焦状态变化（用于页面决定切题后是否保持焦点/软键盘） */
  onNativeFocusChange?: (focused: boolean) => void;
}

export default function RootDisplayCard({
  imageFile,
  answerKey,
  hintChar,
  keyFeedback,
  feedbackType,
  showHint,
  firstTimeHint,
  phoneticHint,
  inputRef,
  onNativeInput,
  onNativeFocusChange,
}: RootDisplayCardProps) {
  const [focused, setFocused] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  // 切题时重置图片加载失败标记
  const [lastFile, setLastFile] = useState(imageFile);
  if (lastFile !== imageFile) {
    setLastFile(imageFile);
    setImgFailed(false);
  }

  return (
    <div className={cn(
      "card-base p-5 sm:p-8 transition-[border-color,background-color] duration-300",
      feedbackType === 'correct' && "border-emerald-300/60 bg-emerald-50/30 dark:border-emerald-700/50 dark:bg-emerald-950/15",
      feedbackType === 'wrong' && "border-red-300/60 bg-red-50/30 dark:border-red-700/50 dark:bg-red-950/15"
    )}>
      <div className="flex flex-col items-center">
        {/* 首次提示 */}
        {showHint && firstTimeHint && !feedbackType && (
          <div className="mb-4 px-3.5 py-2 rounded-lg bg-primary/8 border-l-2 border-primary/30 text-primary dark:text-primary-foreground text-sm font-medium animate-fade-in"
            style={{ fontFamily: "'Noto Serif SC', serif" }}>
            <Lightbulb className="h-3.5 w-3.5 inline mr-1.5" />{firstTimeHint}
          </div>
        )}

        {/* 当前字根图 - 印章/宣纸感。注意 alt/title 不得含文件名与键位，否则悬停即泄露答案 */}
        <div className={cn(
          "relative flex items-center justify-center h-28 w-28 sm:h-36 sm:w-36 rounded-xl border-2 transition-all duration-300 mb-4 overflow-hidden",
          feedbackType === 'correct'
            ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 scale-105"
            : feedbackType === 'wrong'
            ? "border-red-300 bg-red-50/50 dark:bg-red-950/20 scale-95"
            : "border-border/50 bg-gradient-to-b from-amber-50/20 to-transparent dark:from-amber-950/10"
        )}>
          {imgFailed ? (
            <span className="text-xs text-muted-foreground/70 px-2 text-center">字根图加载失败</span>
          ) : (
            <img
              src={rootImagePath(imageFile)}
              alt="字根图"
              draggable={false}
              className="max-h-full max-w-full object-contain p-1 select-none"
              onError={() => setImgFailed(true)}
            />
          )}
          {feedbackType === 'correct' && (
            <div className="absolute -top-1.5 -right-1.5 animate-bounce-in"><CheckCircle2 className="h-6 w-6 text-emerald-500" /></div>
          )}
          {feedbackType === 'wrong' && (
            <div className="absolute -top-1.5 -right-1.5 animate-shake"><XCircle className="h-6 w-6 text-red-500" /></div>
          )}
        </div>

        {/* 输入框 - 可编辑，光标常驻，支持手机原生键盘 */}
        <div
          className="relative w-full max-w-xs"
          onClick={() => inputRef.current?.focus()}
        >
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="输入键位"
            onFocus={() => { setFocused(true); onNativeFocusChange?.(true); }}
            onBlur={() => { setFocused(false); onNativeFocusChange?.(false); }}
            onBeforeInput={(e) => {
              // 逐物理按键提交（beforeinput）：英文键盘每次按键触发一次 insertText；
              // 中文输入法组合过程（insertCompositionText/insertFromComposition）被忽略，
              // 避免组合提交时旧 slice(-1) 逻辑丢字符/误判
              const ne = e.nativeEvent as InputEvent;
              if (ne.inputType === 'insertText' && ne.data && /^[a-z]$/i.test(ne.data)) {
                e.preventDefault(); // 受控组件无需实际插入
                onNativeInput?.(ne.data.toLowerCase());
              } else if (ne.inputType === 'deleteContentBackward' || ne.inputType === 'insertFromPaste' || ne.inputType === 'insertFromDrop') {
                // 字根练习每题一键：退格/粘贴/拖放均无意义，
                // 阻止默认行为避免受控 value 与 state 脱同步或残留未提交文本
                e.preventDefault();
              }
            }}
            className={cn(
              "w-full h-12 sm:h-14 text-center text-2xl sm:text-3xl font-mono font-bold caret-primary",
              "bg-muted/50 border rounded-lg transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
              keyFeedback
                ? (feedbackType === 'correct' ? "border-emerald-300 bg-emerald-50/50 text-emerald-600 dark:text-emerald-400" : "border-red-300 bg-red-50/50 text-red-600 dark:text-red-400")
                : "border-border/50"
            )}
            value={keyFeedback?.toUpperCase() || ''}
          />
          {/* 空态光标占位（聚焦时由真实光标接管，避免双光标） */}
          {!keyFeedback && !focused && (
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none animate-caret-blink text-lg">▎</span>
          )}
        </div>

        {/* 手机端作答提示 */}
        <p className="sm:hidden mt-3 text-xs text-muted-foreground/70 text-center leading-relaxed">
          点击上方输入框或用下方键盘作答
        </p>

        {/* 反馈文字 - 更克制 */}
        {feedbackType && (
          <div className={cn("mt-3 flex items-center justify-center gap-2 text-sm font-medium",
            feedbackType === 'correct' ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}
            style={{ fontFamily: "'Noto Serif SC', serif" }}>
            {feedbackType === 'correct' ? (
              <><CheckCircle2 className="h-4 w-4" /><span>正确</span></>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                <span>正确键位：</span>
                <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-red-100/60 dark:bg-red-900/30 font-mono text-xs font-bold text-red-600 dark:text-red-400">
                  {answerKey.toUpperCase()}
                </span>
              </>
            )}
          </div>
        )}

        {/* 音托提示（仅当本图能对应到码表可渲染字根时才有） */}
        {phoneticHint && hintChar && feedbackType === 'wrong' && showHint && (
          <div className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/8 border-l-2 border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs"
            style={{ fontFamily: "'Noto Serif SC', serif" }}>
            <Lightbulb className="h-3 w-3 inline mr-1" />音托提示：{hintChar} ({phoneticHint})
          </div>
        )}
      </div>
    </div>
  );
}
