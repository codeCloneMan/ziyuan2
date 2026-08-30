import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAchievements } from '@/hooks/use-achievements';
import type { Achievement } from '@/lib/achievements';
import { X } from 'lucide-react';

export default function AchievementToast() {
  const { unlocked } = useAchievements();
  const [toasts, setToasts] = useState<Achievement[]>([]);
  const prevIdsRef = useRef<Set<string>>(new Set(unlocked.map(a => a.id)));
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    const currentIds = new Set(unlocked.map(a => a.id));
    const newOnes = unlocked.filter(a => !prevIdsRef.current.has(a.id));
    prevIdsRef.current = currentIds;

    if (newOnes.length > 0) {
      setToasts(prev => [...prev, ...newOnes]);
      newOnes.forEach((t, i) => {
        const timer = setTimeout(() => {
          dismiss(t.id);
        }, 4500 + i * 600);
        timersRef.current.set(t.id, timer);
      });
    }
  }, [unlocked, dismiss]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-xl border border-amber-500/40',
            'bg-gradient-to-r from-amber-500/15 to-orange-500/10 backdrop-blur-sm shadow-xl',
            'animate-slide-in-up max-w-xs'
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-xl shrink-0">
            {t.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              成就解锁
            </div>
            <div className="text-sm font-bold text-foreground truncate">{t.title}</div>
            <div className="text-[11px] text-muted-foreground truncate">{t.description}</div>
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
