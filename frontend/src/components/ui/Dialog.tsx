import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IconButton } from './Button';
import { IconClose } from './icons';

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

/** Accessible modal dialog (Escape closes, focus moves into the dialog). */
export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  width = 'max-w-lg',
}: DialogProps) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('input, button, select, textarea');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[85vh] w-full ${width} flex-col rounded-md border border-ink-600 bg-ink-850 shadow-2xl`}
      >
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-ink-700 px-4">
          <h2 id={titleId} className="text-sm font-semibold">
            {title}
          </h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <IconClose />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <footer className="flex shrink-0 justify-end gap-2 border-t border-ink-700 px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
