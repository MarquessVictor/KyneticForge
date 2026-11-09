import { useAppStore, type ViewSettings } from '@/stores/appStore';
import { useRobotStore } from '@/stores/robotStore';
import { API_BASE_URL } from '@/services/apiClient';
import { UnitSelect } from '../panels/GeometryPanel';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

const VIEW_OPTIONS: { key: keyof ViewSettings; label: string; hint: string }[] = [
  { key: 'showGrid', label: 'Floor grid', hint: '5 cm cells, 25 cm sections on the XY plane' },
  { key: 'showAxes', label: 'World axes', hint: 'X red, Y green, Z blue at the origin' },
  { key: 'showFrames', label: 'DH frames', hint: 'Axis triads for frames {0}–{3}' },
];

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const mathView = useAppStore((s) => s.mathView);
  const setMathView = useAppStore((s) => s.setMathView);
  const backendVersion = useAppStore((s) => s.backendVersion);
  const backendStatus = useAppStore((s) => s.backendStatus);
  const unit = useRobotStore((s) => s.robot.displayUnit);
  const setDisplayUnit = useRobotStore((s) => s.setDisplayUnit);

  return (
    <Dialog
      open={open}
      title="Settings"
      onClose={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="flex flex-col gap-4">
        <section>
          <h3 className="kf-label mb-2">Units</h3>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-200">Displayed length unit (saved with the project)</span>
            <UnitSelect value={unit} onChange={setDisplayUnit} />
          </div>
          <p className="mt-1 text-[11px] text-ink-400">
            Angles are shown in degrees. All computation uses SI units (metres, radians).
          </p>
        </section>

        <section>
          <h3 className="kf-label mb-2">Viewport</h3>
          <div className="flex flex-col gap-2">
            {VIEW_OPTIONS.map(({ key, label, hint }) => (
              <label key={key} className="flex cursor-pointer items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-accent-500"
                  checked={view[key]}
                  onChange={(e) => setView({ [key]: e.target.checked })}
                />
                <span>
                  <span className="text-ink-100">{label}</span>
                  <span className="block text-[11px] text-ink-400">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <h3 className="kf-label mb-2">Kinematics panel</h3>
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="accent-accent-500"
              checked={mathView === 'detailed'}
              onChange={(e) => setMathView(e.target.checked ? 'detailed' : 'simple')}
            />
            <span className="text-ink-100">Show detailed view (DH table and matrices)</span>
          </label>
        </section>

        <section className="rounded border border-ink-700 bg-ink-900 p-2 text-[11px] text-ink-300">
          <div>
            API endpoint: <span className="kf-mono text-ink-100">{API_BASE_URL}</span>
          </div>
          <div>
            Backend: <span className="text-ink-100">{backendStatus}</span>
            {backendVersion && <span className="kf-mono"> · v{backendVersion}</span>}
          </div>
          <div>
            Frontend: <span className="kf-mono text-ink-100">v{__APP_VERSION__}</span>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
