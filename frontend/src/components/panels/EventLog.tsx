import { useEffect, useRef } from 'react';
import { useLogStore, type LogLevel } from '@/stores/logStore';
import { Button } from '../ui/Button';

const LEVEL_STYLE: Record<LogLevel, { tag: string; cls: string }> = {
  info: { tag: 'INFO', cls: 'text-ink-300' },
  success: { tag: 'OK', cls: 'text-ok' },
  warning: { tag: 'WARN', cls: 'text-warn' },
  error: { tag: 'ERROR', cls: 'text-err' },
};

function time(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour12: false });
}

/** Bottom panel: status messages, validation warnings and operation results. */
export function EventLog() {
  const entries = useLogStore((s) => s.entries);
  const clear = useLogStore((s) => s.clear);
  const listRef = useRef<HTMLOListElement>(null);
  const warnings = entries.filter((e) => e.level === 'warning').length;
  const errors = entries.filter((e) => e.level === 'error').length;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Event log">
      <header className="flex h-7 shrink-0 items-center gap-3 border-b border-ink-700 px-3">
        <h2 className="kf-label">Events</h2>
        <span className="text-[11px] text-ink-400">
          {entries.length} messages ·{' '}
          <span className={warnings ? 'text-warn' : ''}>{warnings} warnings</span> ·{' '}
          <span className={errors ? 'text-err' : ''}>{errors} errors</span>
        </span>
        <Button
          compact
          variant="ghost"
          className="ml-auto"
          onClick={clear}
          disabled={!entries.length}
        >
          Clear
        </Button>
      </header>
      <ol
        ref={listRef}
        className="kf-mono min-h-0 flex-1 overflow-y-auto px-3 py-1 text-[11px]"
        aria-live="polite"
      >
        {entries.length === 0 && <li className="text-ink-500">No events yet.</li>}
        {entries.map((e) => (
          <li key={e.id} className="flex gap-3 py-px">
            <span className="shrink-0 text-ink-500">{time(e.timestamp)}</span>
            <span className={`w-10 shrink-0 ${LEVEL_STYLE[e.level].cls}`}>
              {LEVEL_STYLE[e.level].tag}
            </span>
            <span className="font-sans text-ink-200">{e.message}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
