import { useId, useState, type ReactNode } from 'react';
import { useForwardKinematics } from '@/hooks/useForwardKinematics';
import { useRobotStore } from '@/stores/robotStore';
import type { JointConfig, JointId, SelectableId } from '@/types/robot';
import { axisOf, toRows } from '@/utils/mat4';
import { degToRad, formatLength, formatNumber, radToDeg } from '@/utils/units';
import { EmptyState, PanelSection } from '../ui/Panel';
import { NumberField } from '../ui/NumberField';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5 text-xs">
      <span className="text-ink-400">{label}</span>
      <span className="kf-mono text-right text-ink-100">{children}</span>
    </div>
  );
}

function NameField({ joint }: { joint: JointConfig }) {
  const id = useId();
  const renameJoint = useRobotStore((s) => s.renameJoint);
  // Draft only exists while editing; otherwise the field mirrors the model.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const result = renameJoint(joint.id, draft);
    setDraft(null);
    setError(result.ok ? null : result.error);
  };

  return (
    <div>
      <label htmlFor={id} className="kf-label mb-1 block">
        Name
      </label>
      <input
        id={id}
        className="kf-input"
        value={draft ?? joint.name}
        maxLength={60}
        aria-invalid={error ? 'true' : 'false'}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      {error && <p className="mt-1 text-[11px] text-err">{error}</p>}
    </div>
  );
}

function JointProperties({ jointId }: { jointId: JointId }) {
  const joint = useRobotStore((s) => s.robot.joints.find((j) => j.id === jointId)) as JointConfig;
  const setJointLimits = useRobotStore((s) => s.setJointLimits);
  const setHomeAngle = useRobotStore((s) => s.setHomeAngle);
  const fk = useForwardKinematics();
  const state = fk.joints.find((j) => j.id === jointId);
  const unit = useRobotStore((s) => s.robot.displayUnit);

  return (
    <div className="flex flex-col gap-2">
      <NameField joint={joint} />
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Min angle"
          value={radToDeg(joint.minAngle)}
          unit="°"
          decimals={1}
          min={-360}
          max={360}
          onCommit={(deg) => {
            const r = setJointLimits(jointId, degToRad(deg), joint.maxAngle);
            return r.ok ? null : r.error;
          }}
        />
        <NumberField
          label="Max angle"
          value={radToDeg(joint.maxAngle)}
          unit="°"
          decimals={1}
          min={-360}
          max={360}
          onCommit={(deg) => {
            const r = setJointLimits(jointId, joint.minAngle, degToRad(deg));
            return r.ok ? null : r.error;
          }}
        />
      </div>
      <NumberField
        label="Home angle (initial position)"
        value={radToDeg(joint.homeAngle)}
        unit="°"
        decimals={2}
        onCommit={(deg) => {
          const r = setHomeAngle(jointId, degToRad(deg));
          return r.ok ? null : r.error;
        }}
      />
      {state && (
        <div className="rounded border border-ink-700 bg-ink-900 px-2 py-1">
          <Row label="Type">revolute</Row>
          <Row label="Current">{formatNumber(radToDeg(joint.angle), 2)}°</Row>
          <Row label="Position">
            {state.position.map((c) => formatLength(c, unit).split(' ')[0]).join(', ')} {unit}
          </Row>
          <Row label="Axis (world)">{state.axis.map((c) => formatNumber(c, 3)).join(', ')}</Row>
        </div>
      )}
    </div>
  );
}

function EndEffectorProperties() {
  const fk = useForwardKinematics();
  const unit = useRobotStore((s) => s.robot.displayUnit);
  const rows = toRows(fk.endEffector.transform).slice(0, 3);
  const approach = axisOf(fk.endEffector.transform, 0);
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded border border-ink-700 bg-ink-900 px-2 py-1">
        <Row label="X">{formatLength(fk.endEffector.position[0], unit)}</Row>
        <Row label="Y">{formatLength(fk.endEffector.position[1], unit)}</Row>
        <Row label="Z">{formatLength(fk.endEffector.position[2], unit)}</Row>
        <Row label="Tool direction">{approach.map((c) => formatNumber(c, 3)).join(', ')}</Row>
      </div>
      <div>
        <div className="kf-label mb-1">Orientation R (frame {'{3}'} in world)</div>
        <table className="kf-mono w-full text-right text-[11px] text-ink-200">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.slice(0, 3).map((v, j) => (
                  <td key={j}>{formatNumber(v, 4)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RobotProperties() {
  const robot = useRobotStore((s) => s.robot);
  const project = useRobotStore((s) => s.project);
  const g = robot.geometry;
  const u = robot.displayUnit;
  return (
    <div className="rounded border border-ink-700 bg-ink-900 px-2 py-1">
      <Row label="Model">{robot.model}</Row>
      <Row label="Degrees of freedom">3 (R-R-R)</Row>
      <Row label="Convention">Standard DH</Row>
      <Row label="Total height (stretched)">
        {formatLength(g.baseHeight + g.upperArmLength + g.forearmLength, u)}
      </Row>
      <Row label="Project">{project ? project.name : 'unsaved'}</Row>
    </div>
  );
}

function LengthProperties({ id }: { id: 'base' | 'link1' | 'link2' }) {
  const geometry = useRobotStore((s) => s.robot.geometry);
  const unit = useRobotStore((s) => s.robot.displayUnit);
  const info = {
    base: {
      name: 'Base column',
      value: geometry.baseHeight,
      symbol: 'L0 (d₁)',
      frame: '{0} → {1}',
    },
    link1: {
      name: 'Upper arm',
      value: geometry.upperArmLength,
      symbol: 'L1 (a₂)',
      frame: '{1} → {2}',
    },
    link2: {
      name: 'Forearm',
      value: geometry.forearmLength,
      symbol: 'L2 (a₃)',
      frame: '{2} → {3}',
    },
  }[id];
  return (
    <div className="flex flex-col gap-1">
      <div className="rounded border border-ink-700 bg-ink-900 px-2 py-1">
        <Row label="Element">{info.name}</Row>
        <Row label="Parameter">{info.symbol}</Row>
        <Row label="Length">{formatLength(info.value, unit)}</Row>
        <Row label="Frames">{info.frame}</Row>
      </div>
      <p className="text-[11px] text-ink-400">Edit lengths in the Geometry section.</p>
    </div>
  );
}

const TITLES: Record<SelectableId, string> = {
  robot: 'Robot',
  base: 'Base',
  link1: 'Upper arm',
  link2: 'Forearm',
  endEffector: 'End effector',
  j1: 'Joint J1',
  j2: 'Joint J2',
  j3: 'Joint J3',
};

export function PropertiesPanel() {
  const selected = useRobotStore((s) => s.selected);
  return (
    <PanelSection title={selected ? `Properties · ${TITLES[selected]}` : 'Properties'}>
      {!selected && <EmptyState>Select an element in the hierarchy or the 3D view.</EmptyState>}
      {selected === 'robot' && <RobotProperties />}
      {(selected === 'base' || selected === 'link1' || selected === 'link2') && (
        <LengthProperties id={selected} />
      )}
      {(selected === 'j1' || selected === 'j2' || selected === 'j3') && (
        <JointProperties key={selected} jointId={selected} />
      )}
      {selected === 'endEffector' && <EndEffectorProperties />}
    </PanelSection>
  );
}
