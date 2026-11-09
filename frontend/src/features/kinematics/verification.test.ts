import { describe, expect, it } from 'vitest';
import type { ForwardKinematicsResponse } from '@/services/kinematicsApi';
import { REFERENCE } from '@/test/fixtures';
import { forwardKinematics } from './forwardKinematics';
import { compareWithReference, VERIFICATION_TOLERANCE } from './verification';

function responseFor(frames: number[][][]): ForwardKinematicsResponse {
  return {
    jointAngles: [],
    dhTable: [],
    localTransforms: [],
    frames,
    joints: [],
    endEffector: { position: [], rotation: [], transform: [] },
  };
}

describe('compareWithReference', () => {
  const c = REFERENCE.cases[1]!;
  const local = forwardKinematics(c.geometry, c.jointAngles);

  it('reports a negligible deviation against the backend reference', () => {
    expect(compareWithReference(local, responseFor(c.expected.frames))).toBeLessThanOrEqual(
      VERIFICATION_TOLERANCE,
    );
  });

  it('detects a perturbed reference', () => {
    const tampered = structuredClone(c.expected.frames);
    tampered[2]![0]![3]! += 1e-3;
    expect(compareWithReference(local, responseFor(tampered))).toBeCloseTo(1e-3, 9);
  });

  it('treats a malformed reference as infinitely different', () => {
    expect(compareWithReference(local, responseFor([]))).toBe(Number.POSITIVE_INFINITY);
  });
});
