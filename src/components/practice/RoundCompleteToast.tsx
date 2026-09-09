import { useEffect, useRef } from 'react';

interface RoundCompleteToastProps {
  /** 刚完成的轮次序号；null 表示不显示 */
  roundNo: number | null;
  /** 自动消失回调（父组件把 roundNo 置回 null） */
  onClose: () => void;
}

/**
 * 完成一轮的轻提示：不阻断练习，自动消失后直接继续下一轮。
 */
export default function RoundCompleteToast({ roundNo, onClose }: RoundCompleteToastProps) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (roundNo === null) return;
    const timer = setTimeout(() => onCloseRef.current(), 2200);
    return () => clearTimeout(timer);
  }, [roundNo]);

  if (roundNo === null) return null;

  return (
    <div className="fixed inset-x-0 top-20 sm:top-24 z-50 flex justify-center pointer-events-none px-4">
      <div className="animate-fade-in rounded-full bg-emerald-600/95 text-white px-5 py-2 text-sm font-semibold shadow-lg shadow-emerald-600/25">
        🎉 第 {roundNo} 轮完成 · 已重新开始
      </div>
    </div>
  );
}
