import { describe, expect, it } from 'vitest';
import { REFERENCE } from '@/test/fixtures';
import type { ArmGeometry } from '@/types/robot';
import { fromRows, maxAbsDifference } from '@/utils/mat4';
import { degToRad } from '@/utils/units';
import { forwardKinematics } from './forwardKinematics';

const GEOM: ArmGeometry = { baseHeight: 0.3, upperArmLength: 0.4, forearmLength: 0.3 };
const d = degToRad;

function expectVec(actual: readonly number[], expected: readonly number[], tol = 1e-12) {
  expect(maxAbsDifference(actual, expected)).toBeLessThanOrEqual(tol);
}

describe('forwardKinematics — equivalence with the NumPy reference (shared fixture)', () => {
  it('fixture is present and non-trivial', () => {
    expect(REFERENCE.cases.length).toBeGreaterThanOrEqual(8);
  });

  it.each(REFERENCE.cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const fk = forwardKinematics(c.geometry, c.jointAngles);
    const tol = REFERENCE.tolerance;
    fk.frames.forEach((frame, i) => {
      expect(maxAbsDifference(frame, fromRows(c.expected.frames[i]!))).toBeLessThanOrEqual(tol);
    });
    fk.joints.forEach((joint, i) => {
      expectVec(joint.position, c.expected.jointPositions[i]!, tol);
      expectVec(joint.axis, c.expected.jointAxes[i]!, tol);
    });
    expectVec(fk.endEffector.position, c.expected.endEffectorPosition, tol);
  });
});

describe('forwardKinematics — analytically verifiable poses', () => {
  it('zero pose stretches the arm along +X at shoulder height', () => {
    expectVec(forwardKinematics(GEOM, [0, 0, 0]).endEffector.position, [0.7, 0, 0.3]);
  });

  it('shoulder at 90° points the arm straight up', () => {
    expectVec(forwardKinematics(GEOM, [0, d(90), 0]).endEffector.position, [0, 0, 1.0]);
  });

  it('base at 90° swings the arm onto +Y', () => {
    expectVec(forwardKinematics(GEOM, [d(90), 0, 0]).endEffector.position, [0, 0.7, 0.3]);
  });

  it('elbow at -90° drops the forearm vertically', () => {
    expectVec(forwardKinematics(GEOM, [0, 0, d(-90)]).endEffector.position, [0.4, 0, 0]);
  });

  it('matches the closed-form solution', () => {
    const [q1, q2, q3] = [0.4, 0.9, -1.3] as const;
    const r = 0.4 * Math.cos(q2) + 0.3 * Math.cos(q2 + q3);
    const expected = [
      Math.cos(q1) * r,
      Math.sin(q1) * r,
      0.3 + 0.4 * Math.sin(q2) + 0.3 * Math.sin(q2 + q3),
    ];
    expectVec(forwardKinematics(GEOM, [q1, q2, q3]).endEffector.position, expected);
  });

  it('places the joints at the base, shoulder and elbow', () => {
    const fk = forwardKinematics(GEOM, [0, 0, 0]);
    expectVec(fk.joints[0].position, [0, 0, 0]);
    expectVec(fk.joints[1].position, [0, 0, 0.3]);
    expectVec(fk.joints[2].position, [0.4, 0, 0.3]);
    expectVec(fk.joints[0].axis, [0, 0, 1]);
    expectVec(fk.joints[1].axis, [0, -1, 0]);
  });

  it('preserves link lengths for any pose', () => {
    for (let k = 0; k < 25; k++) {
      const q: [number, number, number] = [
        Math.sin(k) * 3,
        Math.cos(k * 1.7) * 2,
        Math.sin(k * 0.3) * 2.5,
      ];
      const fk = forwardKinematics(GEOM, q);
      const dist = (a: readonly number[], b: readonly number[]) =>
        Math.hypot(...a.map((v, i) => v - b[i]!));
      expect(dist(fk.joints[2].position, fk.joints[1].position)).toBeCloseTo(0.4, 12);
      expect(dist(fk.endEffector.position, fk.joints[2].position)).toBeCloseTo(0.3, 12);
    }
  });

  it('rejects non-finite input', () => {
    expect(() => forwardKinematics(GEOM, [0, Number.NaN, 0])).toThrow(RangeError);
    expect(() => forwardKinematics({ ...GEOM, forearmLength: Infinity }, [0, 0, 0])).toThrow(
      RangeError,
    );
  });
});
