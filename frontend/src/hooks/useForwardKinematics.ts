import { useMemo } from 'react';
import { forwardKinematics } from '@/features/kinematics/forwardKinematics';
import { useRobotStore } from '@/stores/robotStore';
import type { ForwardKinematicsResult } from '@/types/kinematics';

/**
 * Local, synchronous forward kinematics for the current robot state.
 * Recomputed only when the geometry or a joint angle changes.
 */
export function useForwardKinematics(): ForwardKinematicsResult {
  const geometry = useRobotStore((s) => s.robot.geometry);
  const q1 = useRobotStore((s) => s.robot.joints[0].angle);
  const q2 = useRobotStore((s) => s.robot.joints[1].angle);
  const q3 = useRobotStore((s) => s.robot.joints[2].angle);
  return useMemo(() => forwardKinematics(geometry, [q1, q2, q3]), [geometry, q1, q2, q3]);
}
