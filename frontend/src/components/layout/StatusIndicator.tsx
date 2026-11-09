import { useAppStore } from '@/stores/appStore';

/** Application state at a glance: backend connectivity and reference check. */
export function StatusIndicator() {
  const status = useAppStore((s) => s.backendStatus);
  const verification = useAppStore((s) => s.verification);
  const busy = useAppStore((s) => s.busy);

  const { dot, text } =
    status === 'online'
      ? { dot: 'bg-ok', text: busy ? 'Working…' : 'Backend online' }
      : status === 'offline'
        ? { dot: 'bg-err', text: 'Backend offline' }
        : { dot: 'bg-warn animate-pulse', text: 'Connecting…' };

  const checkText =
    verification.status === 'verified'
      ? 'FK verified'
      : verification.status === 'mismatch'
        ? 'FK mismatch'
        : verification.status === 'pending'
          ? 'FK checking'
          : null;

  return (
    <div
      className="ml-1 flex h-7 items-center gap-2 rounded border border-ink-700 bg-ink-850 px-2 text-[11px]"
      role="status"
      aria-label="Application status"
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-ink-200">{text}</span>
      {checkText && (
        <span
          className={`border-l border-ink-700 pl-2 ${
            verification.status === 'mismatch'
              ? 'text-err'
              : verification.status === 'verified'
                ? 'text-ok'
                : 'text-ink-400'
          }`}
        >
          {checkText}
        </span>
      )}
    </div>
  );
}
