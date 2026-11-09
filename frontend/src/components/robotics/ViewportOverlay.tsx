import { useForwardKinematics } from '@/hooks/useForwardKinematics';
import { useAppStore, type ViewSettings } from '@/stores/appStore';
import { useRobotStore } from '@/stores/robotStore';
import { formatLength } from '@/utils/units';
import { IconCamera } from '../ui/icons';

const TOGGLES: { key: keyof ViewSettings; label: string }[] = [
  { key: 'showGrid', label: 'Grid' },
  { key: 'showAxes', label: 'Axes' },
  { key: 'showFrames', label: 'Frames' },
];

/** DOM overlay above the canvas: view toggles, camera reset and live TCP readout. */
export function ViewportOverlay() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const requestCameraReset = useAppStore((s) => s.requestCameraReset);
  const unit = useRobotStore((s) => s.robot.displayUnit);
  const fk = useForwardKinematics();
  const [x, y, z] = fk.endEffector.position;

  return (
    <>
      <div className="pointer-events-none absolute top-2 left-3 text-[11px] text-ink-400">
        Perspective · Z-up · right-handed · SI
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1 rounded border border-ink-700 bg-ink-850/90 p-0.5">
        {TOGGLES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={view[key]}
            onClick={() => setView({ [key]: !view[key] })}
            className={`h-6 rounded px-2 text-[11px] transition-colors ${
              view[key] ? 'bg-ink-700 text-ink-100' : 'text-ink-400 hover:text-ink-200'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="mx-0.5 h-4 w-px bg-ink-700" />
        <button
          type="button"
          onClick={requestCameraReset}
          className="flex h-6 items-center gap-1 rounded px-2 text-[11px] text-ink-300 hover:bg-ink-700 hover:text-ink-100"
          title="Reset camera view"
        >
          <IconCamera size={13} /> Reset view
        </button>
      </div>

      <div className="kf-mono pointer-events-none absolute bottom-2 left-3 rounded border border-ink-700 bg-ink-850/90 px-2 py-1 text-[11px] text-ink-200">
        <span className="text-ink-400">TCP </span>
        <span className="text-axis-x">X</span> {formatLength(x, unit)}{' '}
        <span className="text-axis-y">Y</span> {formatLength(y, unit)}{' '}
        <span className="text-axis-z">Z</span> {formatLength(z, unit)}
      </div>
    </>
  );
}
