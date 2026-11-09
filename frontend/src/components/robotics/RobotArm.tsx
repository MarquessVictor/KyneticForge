import { useForwardKinematics } from '@/hooks/useForwardKinematics';
import { useAppStore } from '@/stores/appStore';
import { useRobotStore } from '@/stores/robotStore';
import { FrameGroup } from './FrameGroup';
import { BaseMesh, EndEffectorMesh, JointMesh, LinkMesh, TurretMesh } from './RobotParts';

/**
 * Scene graph of the 3-DOF arm:
 *
 *   world {0} ─ base plate, J1
 *     └ frame {1} = A1   ─ turret column, J2 housing
 *         └ frame {2} = A2   ─ upper arm (L1), J3 housing
 *             └ frame {3} = A3   ─ forearm (L2), end effector
 *
 * Every frame's matrix comes from forwardKinematics(), so the drawing is the math.
 */
export function RobotArm() {
  const fk = useForwardKinematics();
  const geometry = useRobotStore((s) => s.robot.geometry);
  const showFrames = useAppStore((s) => s.view.showFrames);

  // Visual sizes scale with the arm so very small/large robots stay legible.
  const reach = geometry.baseHeight + geometry.upperArmLength + geometry.forearmLength;
  const r = Math.max(0.012, Math.min(0.06, reach * 0.035));
  const [a1, a2, a3] = fk.localTransforms;
  const triad = r * 4;

  return (
    <group name="frame0">
      <BaseMesh radius={r * 1.6} />
      {showFrames && <axesHelper args={[triad]} />}
      <FrameGroup name="frame1" matrix={a1}>
        <TurretMesh height={geometry.baseHeight} radius={r * 1.1} />
        <JointMesh id="j2" radius={r * 1.3} width={r * 2.6} />
        {showFrames && <axesHelper args={[triad]} />}
        <FrameGroup name="frame2" matrix={a2}>
          <LinkMesh id="link1" length={geometry.upperArmLength} radius={r * 0.85} />
          <JointMesh id="j3" radius={r * 1.1} width={r * 2.2} />
          {showFrames && <axesHelper args={[triad]} />}
          <FrameGroup name="frame3" matrix={a3}>
            <LinkMesh id="link2" length={geometry.forearmLength} radius={r * 0.7} />
            <EndEffectorMesh size={r * 1.2} />
            {showFrames && <axesHelper args={[triad]} />}
          </FrameGroup>
        </FrameGroup>
      </FrameGroup>
    </group>
  );
}
