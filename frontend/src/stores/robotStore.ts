import { create } from 'zustand';
import { createDefaultRobot } from '@/features/simulator/defaultRobot';
import type { Project } from '@/types/project';
import type {
  AngleTriple,
  ArmGeometry,
  JointConfig,
  JointId,
  LengthUnit,
  RobotConfig,
  SelectableId,
} from '@/types/robot';
import { formatAngleDeg } from '@/utils/units';
import {
  clamp,
  describeLimits,
  GEOMETRY_FIELD_LABEL,
  validateGeometryValue,
  validateJointLimits,
  type GeometryKey,
} from '@/utils/validation';
import { log } from './logStore';

export type ActionResult = { ok: true } | { ok: false; error: string };

export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface RobotState {
  robot: RobotConfig;
  /** Open project, or null for an unsaved scratch session. */
  project: ProjectMeta | null;
  dirty: boolean;
  selected: SelectableId | null;

  setJointAngle: (id: JointId, radians: number) => ActionResult;
  setHomeAngle: (id: JointId, radians: number) => ActionResult;
  setJointLimits: (id: JointId, minAngle: number, maxAngle: number) => ActionResult;
  renameJoint: (id: JointId, name: string) => ActionResult;
  resetJoint: (id: JointId) => void;
  resetAllJoints: () => void;
  setHomeFromCurrent: () => void;
  setGeometry: (key: GeometryKey, metres: number) => ActionResult;
  setDisplayUnit: (unit: LengthUnit) => void;
  select: (id: SelectableId | null) => void;

  loadProject: (project: Project) => void;
  updateProjectMeta: (meta: ProjectMeta) => void;
  markSaved: (project: Project) => void;
  newScratch: (robot?: RobotConfig) => void;
}

const jointIndex = (id: JointId): 0 | 1 | 2 => (({ j1: 0, j2: 1, j3: 2 }) as const)[id];

function updateJoint(robot: RobotConfig, id: JointId, patch: Partial<JointConfig>): RobotConfig {
  const joints = robot.joints.map((j) => (j.id === id ? { ...j, ...patch } : j));
  return { ...robot, joints: joints as RobotConfig['joints'] };
}

function metaOf(project: Project): ProjectMeta {
  const { id, name, description, createdAt, updatedAt } = project;
  return { id, name, description, createdAt, updatedAt };
}

export const useRobotStore = create<RobotState>()((set, get) => ({
  robot: createDefaultRobot(),
  project: null,
  dirty: false,
  selected: null,

  setJointAngle: (id, radians) => {
    if (!Number.isFinite(radians)) return { ok: false, error: 'angle must be a finite number' };
    const joint = get().robot.joints[jointIndex(id)];
    const clamped = clamp(radians, joint.minAngle, joint.maxAngle);
    if (clamped !== joint.angle) {
      set((s) => ({ robot: updateJoint(s.robot, id, { angle: clamped }), dirty: true }));
    }
    if (clamped !== radians) {
      const error = `${joint.name}: ${formatAngleDeg(radians)} is outside the limits ${describeLimits(joint)}; clamped to ${formatAngleDeg(clamped)}`;
      log.warning(error);
      return { ok: false, error };
    }
    return { ok: true };
  },

  setHomeAngle: (id, radians) => {
    const joint = get().robot.joints[jointIndex(id)];
    if (!Number.isFinite(radians) || radians < joint.minAngle || radians > joint.maxAngle) {
      const error = `${joint.name}: home angle must be within ${describeLimits(joint)}`;
      log.warning(error);
      return { ok: false, error };
    }
    set((s) => ({ robot: updateJoint(s.robot, id, { homeAngle: radians }), dirty: true }));
    return { ok: true };
  },

  setJointLimits: (id, minAngle, maxAngle) => {
    const joint = get().robot.joints[jointIndex(id)];
    const error = validateJointLimits(minAngle, maxAngle);
    if (error) {
      log.warning(`${joint.name}: ${error}`);
      return { ok: false, error };
    }
    const angle = clamp(joint.angle, minAngle, maxAngle);
    const homeAngle = clamp(joint.homeAngle, minAngle, maxAngle);
    if (angle !== joint.angle || homeAngle !== joint.homeAngle) {
      log.warning(`${joint.name}: current/home angle adjusted to fit the new limits`);
    }
    set((s) => ({
      robot: updateJoint(s.robot, id, { minAngle, maxAngle, angle, homeAngle }),
      dirty: true,
    }));
    log.info(`${joint.name}: limits set to ${describeLimits({ minAngle, maxAngle })}`);
    return { ok: true };
  },

  renameJoint: (id, name) => {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 60) {
      return { ok: false, error: 'name must have 1-60 characters' };
    }
    set((s) => ({ robot: updateJoint(s.robot, id, { name: trimmed }), dirty: true }));
    return { ok: true };
  },

  resetJoint: (id) => {
    const joint = get().robot.joints[jointIndex(id)];
    set((s) => ({ robot: updateJoint(s.robot, id, { angle: joint.homeAngle }), dirty: true }));
  },

  resetAllJoints: () => {
    set((s) => ({
      robot: {
        ...s.robot,
        joints: s.robot.joints.map((j) => ({ ...j, angle: j.homeAngle })) as RobotConfig['joints'],
      },
      dirty: true,
    }));
    log.info('All joints returned to their home position');
  },

  setHomeFromCurrent: () => {
    set((s) => ({
      robot: {
        ...s.robot,
        joints: s.robot.joints.map((j) => ({ ...j, homeAngle: j.angle })) as RobotConfig['joints'],
      },
      dirty: true,
    }));
    log.info('Home position set to the current pose');
  },

  setGeometry: (key, metres) => {
    const error = validateGeometryValue(key, metres);
    if (error) {
      log.warning(`${GEOMETRY_FIELD_LABEL[key]}: ${error}`);
      return { ok: false, error };
    }
    set((s) => ({
      robot: { ...s.robot, geometry: { ...s.robot.geometry, [key]: metres } as ArmGeometry },
      dirty: true,
    }));
    return { ok: true };
  },

  setDisplayUnit: (unit) =>
    set((s) => ({
      robot: { ...s.robot, displayUnit: unit },
      dirty: s.robot.displayUnit !== unit || s.dirty,
    })),

  select: (id) => set({ selected: id }),

  loadProject: (project) =>
    set({
      robot: structuredClone(project.robot),
      project: metaOf(project),
      dirty: false,
      selected: null,
    }),

  updateProjectMeta: (meta) => set({ project: meta }),

  markSaved: (project) => set({ project: metaOf(project), dirty: false }),

  newScratch: (robot) =>
    set({ robot: robot ?? createDefaultRobot(), project: null, dirty: false, selected: null }),
}));

/** Current joint angles as a tuple (stable selector helper). */
export function selectAngles(state: Pick<RobotState, 'robot'>): AngleTriple {
  const [a, b, c] = state.robot.joints;
  return [a.angle, b.angle, c.angle];
}
