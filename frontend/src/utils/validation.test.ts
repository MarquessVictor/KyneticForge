import { describe, expect, it } from 'vitest';
import { createDefaultRobot } from '@/features/simulator/defaultRobot';
import { REFERENCE } from '@/test/fixtures';
import {
  CONSTRAINTS,
  isWithinLimits,
  validateGeometryValue,
  validateJointLimits,
  validateRobotConfig,
} from './validation';

describe('constraints', () => {
  it('match the backend domain rules', () => {
    expect(CONSTRAINTS).toEqual(REFERENCE.constraints);
  });
});

describe('validateGeometryValue', () => {
  it('accepts sane values', () => {
    expect(validateGeometryValue('upperArmLength', 0.4)).toBeNull();
    expect(validateGeometryValue('baseHeight', 0)).toBeNull();
  });

  it.each([
    ['upperArmLength', 0],
    ['forearmLength', 0.005],
    ['baseHeight', -0.1],
    ['forearmLength', 10.5],
    ['upperArmLength', Number.NaN],
    ['upperArmLength', Number.POSITIVE_INFINITY],
  ] as const)('rejects %s = %f', (key, value) => {
    expect(validateGeometryValue(key, value)).not.toBeNull();
  });
});

describe('joint limits', () => {
  it('requires min < max', () => {
    expect(validateJointLimits(-1, 1)).toBeNull();
    expect(validateJointLimits(1, 1)).toMatch(/lower than maximum/);
    expect(validateJointLimits(1, -1)).toMatch(/lower than maximum/);
  });

  it('bounds limits to one full turn', () => {
    expect(validateJointLimits(-2 * Math.PI, 2 * Math.PI)).toBeNull();
    expect(validateJointLimits(-7, 0)).toMatch(/360/);
  });

  it('includes the exact limit values', () => {
    const joint = { minAngle: -1, maxAngle: 1 };
    expect(isWithinLimits(1, joint)).toBe(true);
    expect(isWithinLimits(-1, joint)).toBe(true);
    expect(isWithinLimits(1.001, joint)).toBe(false);
  });
});

describe('validateRobotConfig', () => {
  it('accepts the default robot', () => {
    expect(validateRobotConfig(createDefaultRobot()).ok).toBe(true);
  });

  it('rejects non-objects and missing parts', () => {
    expect(validateRobotConfig(null).ok).toBe(false);
    expect(validateRobotConfig({}).ok).toBe(false);
  });

  it('reports every problem with its field', () => {
    const robot = createDefaultRobot() as unknown as Record<string, any>;
    robot.geometry.forearmLength = -1;
    robot.joints[1].angle = 10;
    robot.joints[2].id = 'elbow';
    robot.extra = true;
    const result = validateRobotConfig(robot);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const fields = result.issues.map((i) => i.field);
    expect(fields).toEqual(
      expect.arrayContaining([
        'geometry.forearmLength',
        'joints[1].angle',
        'joints[2].id',
        'robot.extra',
      ]),
    );
  });

  it('rejects non-numeric angles', () => {
    const robot = createDefaultRobot() as unknown as Record<string, any>;
    robot.joints[0].minAngle = '0';
    expect(validateRobotConfig(robot).ok).toBe(false);
  });
});
