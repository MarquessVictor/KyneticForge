import { create } from 'zustand';

export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export interface LogEntry {
  id: number;
  timestamp: number;
  level: LogLevel;
  message: string;
}

const MAX_ENTRIES = 300;

interface LogState {
  entries: LogEntry[];
  push: (level: LogLevel, message: string) => void;
  clear: () => void;
}

let nextId = 1;

export const useLogStore = create<LogState>()((set) => ({
  entries: [],
  push: (level, message) =>
    set((state) => ({
      entries: [...state.entries, { id: nextId++, timestamp: Date.now(), level, message }].slice(
        -MAX_ENTRIES,
      ),
    })),
  clear: () => set({ entries: [] }),
}));

/** Convenience logger usable outside React components. */
export const log = {
  info: (message: string) => useLogStore.getState().push('info', message),
  success: (message: string) => useLogStore.getState().push('success', message),
  warning: (message: string) => useLogStore.getState().push('warning', message),
  error: (message: string) => useLogStore.getState().push('error', message),
};
