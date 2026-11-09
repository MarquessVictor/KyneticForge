import { useRobotStore } from '@/stores/robotStore';
import { Button } from '../ui/Button';
import { IconHome } from '../ui/icons';
import { PanelSection } from '../ui/Panel';
import { JointControl } from '../controls/JointControl';

export function JointControlsPanel() {
  const joints = useRobotStore((s) => s.robot.joints);
  const resetAllJoints = useRobotStore((s) => s.resetAllJoints);
  const setHomeFromCurrent = useRobotStore((s) => s.setHomeFromCurrent);

  return (
    <PanelSection
      title="Joint control"
      actions={
        <>
          <Button
            compact
            variant="ghost"
            onClick={setHomeFromCurrent}
            title="Store the current pose as home"
          >
            Set home
          </Button>
          <Button compact variant="ghost" icon={<IconHome size={12} />} onClick={resetAllJoints}>
            Home all
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {joints.map((joint) => (
          <JointControl key={joint.id} joint={joint} />
        ))}
      </div>
    </PanelSection>
  );
}
