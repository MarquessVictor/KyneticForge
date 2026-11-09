import type { ForwardKinematicsResponse } from '@/services/kinematicsApi';
import type { ForwardKinematicsResult } from '@/types/kinematics';
import { fromRows, maxAbsDifference } from '@/utils/mat4';

/** Maximum element-wise deviation tolerated between local and reference results. */
export const VERIFICATION_TOLERANCE = 1e-9;

/** Largest absolute difference between the local (TS) and reference (NumPy) frames. */
export function compareWithReference(
  local: ForwardKinematicsResult,
  reference: ForwardKinematicsResponse,
): number {
  if (reference.frames.length !== local.frames.length) return Number.POSITIVE_INFINITY;
  let max = 0;
  local.frames.forEach((frame, i) => {
    const ref = reference.frames[i];
    max = Math.max(max, ref ? maxAbsDifference(frame, fromRows(ref)) : Number.POSITIVE_INFINITY);
  });
  return max;
}
