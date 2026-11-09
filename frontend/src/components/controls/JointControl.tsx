import { useId } from 'react';
import { useRobotStore } from '@/stores/robotStore';
import type { JointConfig } from '@/types/robot';
import { degToRad, formatNumber, radToDeg } from '@/utils/units';
import { IconButton } from '../ui/Button';
import { IconReset } from '../ui/icons';
import { NumberField } from '../ui/NumberField';

const SLIDER_STEP_DEG = 0.1;

/**
 * Control for one revolute joint. The UI works in degrees; the store and the
 * kinematics always receive radians. Values outside the limits are clamped by
 * the store and reported in the event log.
 */
export function JointControl({ joint }: { joint: JointConfig }) {
  const sliderId = useId();
  const setJointAngle = useRobotStore((s) => s.setJointAngle);
  const resetJoint = useRobotStore((s) => s.resetJoint);
  const select = useRobotStore((s) => s.select);
  const selected = useRobotStore((s) => s.selected === joint.id);

  const angleDeg = radToDeg(joint.angle);
  const minDeg = radToDeg(joint.minAngle);
  const maxDeg = radToDeg(joint.maxAngle);
  const atHome = Math.abs(joint.angle - joint.homeAngle) < 1e-12;

  return (
    <div
      className={`rounded border px-2.5 pt-2 pb-2.5 transition-colors ${
        selected ? 'border-accent-600 bg-accent-900/20' : 'border-ink-700 bg-ink-850'
      }`}
      onFocusCapture={() => select(joint.id)}
      data-testid={`joint-control-${joint.id}`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <button
          type="button"
          className="flex items-baseline gap-2 text-left"
          onClick={() => select(joint.id)}
        >
          <span className="kf-mono rounded bg-ink-700 px-1 text-[10px] text-ink-300">
            {joint.id.toUpperCase()}
          </span>
          <span className="text-xs font-medium text-ink-100">{joint.name}</span>
        </button>
        <IconButton
          label={`Reset ${joint.name} to home`}
          onClick={() => resetJoint(joint.id)}
          disabled={atHome}
        >
          <IconReset size={14} />
        </IconButton>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor={sliderId} className="sr-only">
          {joint.name} angle slider
        </label>
        <input
          id={sliderId}
          type="range"
          className="kf-range"
          min={minDeg}
          max={maxDeg}
          step={SLIDER_STEP_DEG}
          value={angleDeg}
          onChange={(e) => setJointAngle(joint.id, degToRad(Number(e.target.value)))}
        />
        <NumberField
          label={`${joint.name} angle`}
          hideLabel
          className="w-24 shrink-0"
          value={angleDeg}
          unit="°"
          decimals={2}
          onCommit={(deg) => {
            const result = setJointAngle(joint.id, degToRad(deg));
            return result.ok
              ? null
              : `Limits: ${formatNumber(minDeg, 1)}° to ${formatNumber(maxDeg, 1)}°`;
          }}
        />
      </div>

      <div className="kf-mono mt-1 flex justify-between text-[10px] text-ink-400">
        <span>min {formatNumber(minDeg, 1)}°</span>
        <span>home {formatNumber(radToDeg(joint.homeAngle), 1)}°</span>
        <span>max {formatNumber(maxDeg, 1)}°</span>
      </div>
    </div>
  );
}
