import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultRobot } from '@/features/simulator/defaultRobot';
import type { Project } from '@/types/project';
import { degToRad } from '@/utils/units';
import { useLogStore } from './logStore';
import { selectAngles, useRobotStore } from './robotStore';

const store = () => useRobotStore.getState();
const joint = (i: 0 | 1 | 2) => store().robot.joints[i];

beforeEach(() => {
  store().newScratch();
  useLogStore.getState().clear();
});

describe('joint angles', () => {
  it('sets an angle within limits and marks the robot dirty', () => {
    expect(store().setJointAngle('j2', degToRad(10))).toEqual({ ok: true });
    expect(joint(1).angle).toBeCloseTo(degToRad(10), 15);
    expect(store().dirty).toBe(true);
  });

  it('clamps values above the maximum and logs a warning', () => {
    const result = store().setJointAngle('j3', degToRad(200));
    expect(result.ok).toBe(false);
    expect(joint(2).angle).toBe(joint(2).maxAngle);
    expect(useLogStore.getState().entries.at(-1)?.level).toBe('warning');
  });

  it('clamps values below the minimum', () => {
    store().setJointAngle('j2', degToRad(-90));
    expect(joint(1).angle).toBe(joint(1).minAngle);
  });

  it('rejects non-finite values without changing state', () => {
    const before = joint(0).angle;
    expect(store().setJointAngle('j1', Number.NaN).ok).toBe(false);
    expect(joint(0).angle).toBe(before);
  });

  it('resets a joint and all joints to home', () => {
    store().setJointAngle('j1', 0);
    store().setJointAngle('j2', 0);
    store().resetJoint('j1');
    expect(joint(0).angle).toBe(joint(0).homeAngle);
    expect(joint(1).angle).toBe(0);
    store().resetAllJoints();
    expect(selectAngles(store())).toEqual(store().robot.joints.map((j) => j.homeAngle));
  });

  it('can store the current pose as home', () => {
    store().setJointAngle('j2', 0.5);
    store().setHomeFromCurrent();
    expect(joint(1).homeAngle).toBe(0.5);
  });
});

describe('joint limits and home', () => {
  it('rejects inverted limits', () => {
    expect(store().setJointLimits('j1', 1, -1).ok).toBe(false);
    expect(joint(0).minAngle).toBe(-Math.PI);
  });

  it('pulls the current and home angles inside narrowed limits', () => {
    store().setJointLimits('j2', degToRad(70), degToRad(80));
    expect(joint(1).angle).toBeCloseTo(degToRad(70), 15);
    expect(joint(1).homeAngle).toBeCloseTo(degToRad(70), 15);
  });

  it('rejects a home angle outside the limits', () => {
    expect(store().setHomeAngle('j3', degToRad(170)).ok).toBe(false);
    expect(store().setHomeAngle('j3', degToRad(10)).ok).toBe(true);
    expect(joint(2).homeAngle).toBeCloseTo(degToRad(10), 15);
  });

  it('validates joint names', () => {
    expect(store().renameJoint('j1', '   ').ok).toBe(false);
    expect(store().renameJoint('j1', '  Waist ').ok).toBe(true);
    expect(joint(0).name).toBe('Waist');
  });
});

describe('geometry', () => {
  it('updates a length in metres', () => {
    expect(store().setGeometry('forearmLength', 0.55).ok).toBe(true);
    expect(store().robot.geometry.forearmLength).toBe(0.55);
  });

  it('rejects invalid lengths without changing state', () => {
    expect(store().setGeometry('upperArmLength', 0).ok).toBe(false);
    expect(store().setGeometry('upperArmLength', 50).ok).toBe(false);
    expect(store().robot.geometry.upperArmLength).toBe(0.4);
  });

  it('changes the display unit without touching SI values', () => {
    store().setDisplayUnit('mm');
    expect(store().robot.displayUnit).toBe('mm');
    expect(store().robot.geometry.upperArmLength).toBe(0.4);
  });
});

describe('projects', () => {
  const project: Project = {
    id: 'abc',
    name: 'Cell',
    description: '',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    schemaVersion: 1,
    robot: { ...createDefaultRobot(), displayUnit: 'cm' },
  };

  it('loads a project as clean state with a private copy of the robot', () => {
    store().setJointAngle('j1', 0);
    store().loadProject(project);
    expect(store().dirty).toBe(false);
    expect(store().project?.name).toBe('Cell');
    expect(store().robot.displayUnit).toBe('cm');
    store().setJointAngle('j1', 0.1);
    expect(project.robot.joints[0].angle).not.toBe(0.1);
  });

  it('markSaved clears the dirty flag', () => {
    store().setJointAngle('j1', 0.2);
    store().markSaved(project);
    expect(store().dirty).toBe(false);
    expect(store().project?.id).toBe('abc');
  });
});
