import { useForwardKinematics } from '@/hooks/useForwardKinematics';
import { useAppStore, type VerificationState } from '@/stores/appStore';
import { useRobotStore } from '@/stores/robotStore';
import type { Vec3 } from '@/types/kinematics';
import type { LengthUnit } from '@/types/robot';
import { axisOf } from '@/utils/mat4';
import {
  formatAngleDeg,
  formatNumber,
  LENGTH_DECIMALS,
  lengthFromSi,
  radToDeg,
} from '@/utils/units';
import { PanelSection } from '../ui/Panel';
import { MatrixView } from './MatrixView';

function Vec({ v, unit }: { v: Vec3; unit: LengthUnit }) {
  const d = LENGTH_DECIMALS[unit];
  return (
    <span className="kf-mono">
      ({v.map((c) => formatNumber(lengthFromSi(c, unit), d)).join(', ')})
    </span>
  );
}

function UnitVec({ v }: { v: Vec3 }) {
  return <span className="kf-mono">({v.map((c) => formatNumber(c, 3)).join(', ')})</span>;
}

function VerificationBadge({ state }: { state: VerificationState }) {
  const map: Record<VerificationState['status'], { text: string; cls: string }> = {
    idle: { text: 'Reference check unavailable (backend offline)', cls: 'text-ink-400' },
    pending: { text: 'Checking against backend reference…', cls: 'text-ink-300' },
    verified: { text: 'Matches NumPy reference', cls: 'text-ok' },
    mismatch: { text: 'Mismatch with NumPy reference', cls: 'text-err' },
    error: { text: 'Reference check failed', cls: 'text-err' },
  };
  const { text, cls } = map[state.status];
  const detail =
    state.status === 'verified' || state.status === 'mismatch'
      ? ` · max |Δ| = ${state.maxDeviation.toExponential(1)}`
      : '';
  return (
    <p className={`text-[11px] ${cls}`} role="status">
      {text}
      <span className="kf-mono">{detail}</span>
    </p>
  );
}

/** Live mathematical results: TCP pose, joint states, DH table and transforms. */
export function KinematicsPanel() {
  const fk = useForwardKinematics();
  const robot = useRobotStore((s) => s.robot);
  const mathView = useAppStore((s) => s.mathView);
  const setMathView = useAppStore((s) => s.setMathView);
  const verification = useAppStore((s) => s.verification);
  const unit = robot.displayUnit;
  const d = LENGTH_DECIMALS[unit];
  const [x, y, z] = fk.endEffector.position;
  const approach = axisOf(fk.endEffector.transform, 0);

  return (
    <PanelSection
      title="Kinematics"
      actions={
        <div
          role="radiogroup"
          aria-label="Detail level"
          className="flex rounded border border-ink-700 p-0.5"
        >
          {(['simple', 'detailed'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={mathView === mode}
              onClick={() => setMathView(mode)}
              className={`h-5 rounded px-2 text-[11px] capitalize ${
                mathView === mode ? 'bg-ink-700 text-ink-100' : 'text-ink-400 hover:text-ink-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-2 grid grid-cols-3 gap-1.5" aria-label="End-effector position">
        {(
          [
            ['X', x, 'text-axis-x'],
            ['Y', y, 'text-axis-y'],
            ['Z', z, 'text-axis-z'],
          ] as const
        ).map(([label, value, cls]) => (
          <div key={label} className="rounded border border-ink-700 bg-ink-900 px-2 py-1.5">
            <div className={`text-[10px] font-semibold ${cls}`}>{label}</div>
            <div className="kf-mono text-sm text-ink-100" data-testid={`ee-${label.toLowerCase()}`}>
              {formatNumber(lengthFromSi(value, unit), d)}
            </div>
            <div className="text-[10px] text-ink-400">{unit}</div>
          </div>
        ))}
      </div>
      <VerificationBadge state={verification} />

      <table className="mt-2 w-full text-[11px]">
        <thead>
          <tr className="text-left text-ink-400">
            <th className="py-0.5 font-medium">Joint</th>
            <th className="py-0.5 text-right font-medium">q (deg)</th>
            <th className="py-0.5 text-right font-medium">q (rad)</th>
          </tr>
        </thead>
        <tbody className="kf-mono">
          {robot.joints.map((j) => (
            <tr key={j.id} className="border-t border-ink-800">
              <td className="py-0.5 font-sans text-ink-200">
                {j.id.toUpperCase()} {j.name}
              </td>
              <td className="py-0.5 text-right text-ink-100">
                {formatNumber(radToDeg(j.angle), 2)}
              </td>
              <td className="py-0.5 text-right text-ink-300">{formatNumber(j.angle, 4)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {mathView === 'detailed' && (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <h3 className="kf-label mb-1">Joint positions (world)</h3>
            <ul className="space-y-0.5 text-[11px] text-ink-200">
              {fk.joints.map((j) => (
                <li key={j.id} className="flex justify-between gap-2">
                  <span>{j.id.toUpperCase()} at</span>
                  <Vec v={j.position} unit={unit} />
                </li>
              ))}
              <li className="flex justify-between gap-2">
                <span>TCP at</span>
                <Vec v={fk.endEffector.position} unit={unit} />
              </li>
            </ul>
            <h3 className="kf-label mt-2 mb-1">Joint axes (world, unit vectors)</h3>
            <ul className="space-y-0.5 text-[11px] text-ink-200">
              {fk.joints.map((j) => (
                <li key={j.id} className="flex justify-between gap-2">
                  <span>
                    {j.id.toUpperCase()} axis z{Number(j.id[1]) - 1}
                  </span>
                  <UnitVec v={j.axis} />
                </li>
              ))}
              <li className="flex justify-between gap-2">
                <span>Tool direction x3</span>
                <UnitVec v={approach} />
              </li>
            </ul>
          </div>

          <div>
            <h3 className="kf-label mb-1">Denavit–Hartenberg table</h3>
            <table className="kf-mono w-full text-right text-[11px]">
              <thead className="text-ink-400">
                <tr>
                  <th className="text-left font-sans font-medium">i</th>
                  <th className="font-medium">θ</th>
                  <th className="font-medium">d ({unit})</th>
                  <th className="font-medium">a ({unit})</th>
                  <th className="font-medium">α</th>
                </tr>
              </thead>
              <tbody className="text-ink-200">
                {fk.dhTable.map((p, i) => (
                  <tr key={i} className="border-t border-ink-800">
                    <td className="text-left">{i + 1}</td>
                    <td>{formatAngleDeg(p.theta, 1)}</td>
                    <td>{formatNumber(lengthFromSi(p.d, unit), d)}</td>
                    <td>{formatNumber(lengthFromSi(p.a, unit), d)}</td>
                    <td>{formatAngleDeg(p.alpha, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="kf-label">Homogeneous transforms (translations in m)</h3>
            {fk.localTransforms.map((m, i) => (
              <MatrixView
                key={`A${i}`}
                label={`A${i + 1} = T${i}→${i + 1}`}
                caption="local"
                matrix={m}
              />
            ))}
            {fk.frames.map((m, i) => (
              <MatrixView
                key={`T${i}`}
                label={`T0→${i + 1}`}
                caption={i === 2 ? 'end effector (world)' : 'world'}
                matrix={m}
              />
            ))}
          </div>

          <p className="text-[11px] leading-relaxed text-ink-400">
            Frames: {'{0}'} world (Z up, right-handed) at the base; {'{1}'} at the shoulder; {'{2}'}{' '}
            at the elbow; {'{3}'} tool frame at the arm tip. T0→3 = A1·A2·A3 with A =
            Rz(θ)·Tz(d)·Tx(a)·Rx(α).
          </p>
        </div>
      )}
    </PanelSection>
  );
}
