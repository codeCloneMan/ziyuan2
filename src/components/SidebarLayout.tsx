import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SidebarLayoutProps {
  children: ReactNode;
  sidebarWidth?: string;
  className?: string;
}

export function SidebarLayout({ 
  children, 
  sidebarWidth = '280px',
  className 
}: SidebarLayoutProps) {
  let sidebar: ReactNode = null;
  let mainContent: ReactNode = null;

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      if (child.type === SidebarLeft) {
        sidebar = child;
      } else if (child.type === SidebarRight) {
        mainContent = child;
      }
    }
  });

  return (
    <div className={cn('flex min-h-[calc(100vh-4rem)]', className)}>
      {/* 左侧边栏 */}
      <aside 
        className="flex-shrink-0 border-r border-border bg-card/30 overflow-y-auto sticky top-16 h-[calc(100vh-4rem)]"
        style={{ width: sidebarWidth }}
      >
        <div className="p-4">
          {sidebar}
        </div>
      </aside>

      {/* 右侧主内容区 */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 max-w-none">
          {mainContent}
        </div>
      </main>
    </div>
  );
}

interface SidebarLeftProps {
  children: ReactNode;
  className?: string;
}

export function SidebarLeft({ children, className }: SidebarLeftProps) {
  return <div className={cn('', className)}>{children}</div>;
}

interface SidebarRightProps {
  children: ReactNode;
  className?: string;
}

export function SidebarRight({ children, className }: SidebarRightProps) {
  return <div className={cn('', className)}>{children}</div>;
}

interface SidebarSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function SidebarSection({ title, children, className }: SidebarSectionProps) {
  return (
    <div className={cn('mb-6', className)}>
      {title && (
        <h3 className="text-sm font-semibold text-foreground mb-3 px-2">
          {title}
        </h3>
      )}
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

interface SidebarItemProps {
  icon?: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function SidebarItem({ icon, label, active, onClick, className }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left',
        active
          ? 'bg-primary text-primary-foreground font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/10',
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}