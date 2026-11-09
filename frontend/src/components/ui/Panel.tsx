import type { ReactNode } from 'react';

interface PanelSectionProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Titled section inside a side panel. */
export function PanelSection({ title, actions, children, className = '' }: PanelSectionProps) {
  return (
    <section className={`border-b border-ink-700 ${className}`} aria-label={title}>
      <header className="flex h-8 items-center justify-between px-3">
        <h2 className="kf-label">{title}</h2>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </header>
      <div className="px-3 pb-3">{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-2 text-xs text-ink-400">{children}</p>;
}
