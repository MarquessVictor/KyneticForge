import { useId, useRef, useState, type KeyboardEvent } from 'react';

export interface NumberFieldProps {
  label: string;
  /** Value in display units. */
  value: number;
  /**
   * Called with the parsed value when the user commits (Enter or blur).
   * Return an error message to reject the value, or null to accept it.
   */
  onCommit: (value: number) => string | null;
  unit?: string;
  decimals?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  hideLabel?: boolean;
  className?: string;
}

/**
 * Numeric input that edits a local draft and only commits on Enter/blur,
 * so partially typed values ("-", "1.") never reach the model. While not
 * focused it always shows the current model value.
 */
export function NumberField({
  label,
  value,
  onCommit,
  unit,
  decimals = 3,
  min,
  max,
  disabled,
  hideLabel,
  className = '',
}: NumberFieldProps) {
  const id = useId();
  const formatted = value.toFixed(decimals);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  const commit = () => {
    const text = draft;
    setDraft(null);
    if (cancelled.current || text === null) {
      cancelled.current = false;
      return;
    }
    const parsed = Number(text.replace(',', '.'));
    if (text.trim() === '' || !Number.isFinite(parsed)) return setError('Enter a valid number');
    if (min !== undefined && parsed < min) return setError(`Minimum is ${min.toFixed(decimals)}`);
    if (max !== undefined && parsed > max) return setError(`Maximum is ${max.toFixed(decimals)}`);
    setError(onCommit(parsed));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    if (e.key === 'Escape') {
      cancelled.current = true;
      setError(null);
      e.currentTarget.blur();
    }
  };

  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'kf-label mb-1 block'}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          className={`kf-input kf-mono ${unit ? 'pr-8' : ''}`}
          value={draft ?? formatted}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-err` : undefined}
          onFocus={() => setDraft(formatted)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
        {unit && (
          <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[11px] text-ink-400">
            {unit}
          </span>
        )}
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-[11px] text-err">
          {error}
        </p>
      )}
    </div>
  );
}
