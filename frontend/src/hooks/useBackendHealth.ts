import { useEffect } from 'react';
import { systemApi } from '@/services/kinematicsApi';
import { useAppStore } from '@/stores/appStore';
import { log } from '@/stores/logStore';

const POLL_MS = 10_000;

/** Polls /health and keeps `backendStatus` up to date, logging transitions. */
export function useBackendHealth(): void {
  const setBackendStatus = useAppStore((s) => s.setBackendStatus);

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;

    const check = async () => {
      controller?.abort();
      controller = new AbortController();
      const previous = useAppStore.getState().backendStatus;
      try {
        const health = await systemApi.health(controller.signal);
        if (cancelled) return;
        setBackendStatus('online', health.version);
        if (previous !== 'online') log.success(`Connected to backend v${health.version}`);
      } catch {
        if (cancelled || controller.signal.aborted) return;
        setBackendStatus('offline');
        if (previous !== 'offline') {
          log.warning('Backend unreachable — simulation keeps running locally; saving is disabled');
        }
      }
    };

    void check();
    const interval = window.setInterval(() => void check(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      controller?.abort();
    };
  }, [setBackendStatus]);
}
