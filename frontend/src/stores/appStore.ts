import { create } from 'zustand';

export type BackendStatus = 'checking' | 'online' | 'offline';

export type VerificationState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'verified'; maxDeviation: number; checkedAt: number }
  | { status: 'mismatch'; maxDeviation: number; checkedAt: number }
  | { status: 'error'; message: string };

export type MathView = 'simple' | 'detailed';

export interface ViewSettings {
  showGrid: boolean;
  showAxes: boolean;
  showFrames: boolean;
}

interface AppState {
  backendStatus: BackendStatus;
  backendVersion: string | null;
  verification: VerificationState;
  mathView: MathView;
  view: ViewSettings;
  /** Incremented to ask the 3D viewer to reset its camera. */
  cameraResetToken: number;
  busy: boolean;

  setBackendStatus: (status: BackendStatus, version?: string | null) => void;
  setVerification: (state: VerificationState) => void;
  setMathView: (view: MathView) => void;
  setView: (patch: Partial<ViewSettings>) => void;
  requestCameraReset: () => void;
  setBusy: (busy: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  backendStatus: 'checking',
  backendVersion: null,
  verification: { status: 'idle' },
  mathView: 'simple',
  view: { showGrid: true, showAxes: true, showFrames: false },
  cameraResetToken: 0,
  busy: false,

  setBackendStatus: (backendStatus, version = null) =>
    set({ backendStatus, backendVersion: version }),
  setVerification: (verification) => set({ verification }),
  setMathView: (mathView) => set({ mathView }),
  setView: (patch) => set((s) => ({ view: { ...s.view, ...patch } })),
  requestCameraReset: () => set((s) => ({ cameraResetToken: s.cameraResetToken + 1 })),
  setBusy: (busy) => set({ busy }),
}));
