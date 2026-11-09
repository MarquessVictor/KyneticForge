import { useRobotStore } from '@/stores/robotStore';
import type { LengthUnit } from '@/types/robot';
import { LENGTH_DECIMALS, LENGTH_UNITS, lengthFromSi, lengthToSi } from '@/utils/units';
import {
  CONSTRAINTS,
  GEOMETRY_FIELD_LABEL,
  geometryMinimum,
  type GeometryKey,
} from '@/utils/validation';
import { PanelSection } from '../ui/Panel';
import { NumberField } from '../ui/NumberField';

const KEYS: GeometryKey[] = ['baseHeight', 'upperArmLength', 'forearmLength'];

export function UnitSelect({
  value,
  onChange,
}: {
  value: LengthUnit;
  onChange: (u: LengthUnit) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Display length unit"
      className="flex rounded border border-ink-700 p-0.5"
    >
      {LENGTH_UNITS.map((u) => (
        <button
          key={u}
          type="button"
          role="radio"
          aria-checked={value === u}
          onClick={() => onChange(u)}
          className={`kf-mono h-5 rounded px-1.5 text-[11px] ${
            value === u ? 'bg-ink-700 text-ink-100' : 'text-ink-400 hover:text-ink-200'
          }`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

/** Geometric parameters. Edited in the display unit, stored in metres. */
export function GeometryPanel() {
  const geometry = useRobotStore((s) => s.robot.geometry);
  const unit = useRobotStore((s) => s.robot.displayUnit);
  const setGeometry = useRobotStore((s) => s.setGeometry);
  const setDisplayUnit = useRobotStore((s) => s.setDisplayUnit);
  const decimals = LENGTH_DECIMALS[unit];

  return (
    <PanelSection title="Geometry" actions={<UnitSelect value={unit} onChange={setDisplayUnit} />}>
      <div className="flex flex-col gap-2">
        {KEYS.map((key) => (
          <NumberField
            key={key}
            label={GEOMETRY_FIELD_LABEL[key]}
            value={lengthFromSi(geometry[key], unit)}
            unit={unit}
            decimals={decimals}
            min={lengthFromSi(geometryMinimum(key), unit)}
            max={lengthFromSi(CONSTRAINTS.maxLength, unit)}
            onCommit={(v) => {
              const result = setGeometry(key, lengthToSi(v, unit));
              return result.ok ? null : result.error;
            }}
          />
        ))}
        <p className="text-[11px] text-ink-400">
          Max reach from shoulder:{' '}
          <span className="kf-mono text-ink-200">
            {lengthFromSi(geometry.upperArmLength + geometry.forearmLength, unit).toFixed(decimals)}{' '}
            {unit}
          </span>
        </p>
      </div>
    </PanelSection>
  );
}
