import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'default' | 'primary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  default: 'border-ink-600 bg-ink-800 text-ink-100 hover:border-ink-500 hover:bg-ink-700',
  primary: 'border-accent-600 bg-accent-600/20 text-accent-400 hover:bg-accent-600/30',
  ghost: 'border-transparent bg-transparent text-ink-200 hover:bg-ink-700 hover:text-ink-100',
  danger: 'border-err/60 bg-err/10 text-err hover:bg-err/20',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
  compact?: boolean;
}

export function Button({
  variant = 'default',
  icon,
  compact = false,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded border font-medium
        transition-colors disabled:pointer-events-none disabled:opacity-40
        ${compact ? 'h-6 px-1.5 text-[11px]' : 'h-7 px-2.5 text-xs'} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({
  label,
  children,
  className = '',
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex h-6 w-6 items-center justify-center rounded text-ink-300 transition-colors
        hover:bg-ink-700 hover:text-ink-100 disabled:pointer-events-none disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
