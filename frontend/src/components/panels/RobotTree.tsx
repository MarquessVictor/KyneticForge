import type { ReactNode } from 'react';
import { useRobotStore } from '@/stores/robotStore';
import type { SelectableId } from '@/types/robot';
import { formatAngleDeg, formatLength } from '@/utils/units';
import { IconBase, IconJoint, IconLink, IconRobot, IconTool, IconWorld } from '../ui/icons';
import { PanelSection } from '../ui/Panel';

interface Node {
  id: SelectableId;
  label: string;
  detail: string;
  icon: ReactNode;
  depth: number;
}

/** Kinematic chain as a selectable tree (world → base → joints/links → tool). */
export function RobotTree() {
  const robot = useRobotStore((s) => s.robot);
  const selected = useRobotStore((s) => s.selected);
  const select = useRobotStore((s) => s.select);
  const { geometry, joints, displayUnit: u } = robot;
  const [j1, j2, j3] = joints;

  const nodes: Node[] = [
    { id: 'robot', label: '3-DOF RRR arm', detail: robot.model, icon: <IconRobot />, depth: 0 },
    {
      id: 'base',
      label: 'Base',
      detail: `L0 ${formatLength(geometry.baseHeight, u)}`,
      icon: <IconBase />,
      depth: 1,
    },
    {
      id: 'j1',
      label: j1.name,
      detail: `J1 · ${formatAngleDeg(j1.angle, 1)}`,
      icon: <IconJoint />,
      depth: 2,
    },
    {
      id: 'j2',
      label: j2.name,
      detail: `J2 · ${formatAngleDeg(j2.angle, 1)}`,
      icon: <IconJoint />,
      depth: 3,
    },
    {
      id: 'link1',
      label: 'Upper arm',
      detail: `L1 ${formatLength(geometry.upperArmLength, u)}`,
      icon: <IconLink />,
      depth: 4,
    },
    {
      id: 'j3',
      label: j3.name,
      detail: `J3 · ${formatAngleDeg(j3.angle, 1)}`,
      icon: <IconJoint />,
      depth: 5,
    },
    {
      id: 'link2',
      label: 'Forearm',
      detail: `L2 ${formatLength(geometry.forearmLength, u)}`,
      icon: <IconLink />,
      depth: 6,
    },
    { id: 'endEffector', label: 'End effector', detail: 'TCP', icon: <IconTool />, depth: 7 },
  ];

  return (
    <PanelSection title="Robot hierarchy">
      <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] text-ink-400">
        <IconWorld size={13} /> World frame {'{0}'}
      </div>
      <ul role="tree" aria-label="Robot hierarchy" className="flex flex-col">
        {nodes.map((n) => {
          const active = selected === n.id;
          return (
            <li key={n.id} role="treeitem" aria-selected={active}>
              <button
                type="button"
                onClick={() => select(n.id)}
                className={`flex h-7 w-full items-center gap-1.5 rounded pr-2 text-left text-xs transition-colors ${
                  active ? 'bg-accent-900/40 text-accent-400' : 'text-ink-200 hover:bg-ink-800'
                }`}
                style={{ paddingLeft: `${4 + Math.min(n.depth, 7) * 9}px` }}
              >
                <span className={active ? 'text-accent-400' : 'text-ink-400'}>{n.icon}</span>
                <span className="truncate">{n.label}</span>
                <span className="kf-mono ml-auto shrink-0 text-[10px] text-ink-400">
                  {n.detail}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </PanelSection>
  );
}
