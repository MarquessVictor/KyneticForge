import type { ArmGeometry, JointConfig, RobotConfig } from '@/types/robot';
import { JOINT_IDS } from '@/types/robot';
import { radToDeg } from './units';

/**
 * Client-side mirror of backend/app/robotics/validation.py, used for instant
 * feedback in the UI. The backend remains authoritative: every save/import is
 * validated again there. The constants are checked against the backend values
 * in validation.test.ts through the shared fixture.
 */
export const CONSTRAINTS = {
  minLinkLength: 0.01,
  minBaseHeight: 0.0,
  maxLength: 10.0,
  angleBound: 2 * Math.PI,
} as const;

export const LIMIT_TOLERANCE = 1e-9;

export interface ValidationIssue {
  field: string;
  message: string;
}

export type GeometryKey = keyof ArmGeometry;

export const GEOMETRY_FIELD_LABEL: Record<GeometryKey, string> = {
  baseHeight: 'Base height (L0)',
  upperArmLength: 'Upper arm (L1)',
  forearmLength: 'Forearm (L2)',
};

export function geometryMinimum(key: GeometryKey): number {
  return key === 'baseHeight' ? CONSTRAINTS.minBaseHeight : CONSTRAINTS.minLinkLength;
}

/** Returns an error message, or null when the value (in metres) is acceptable. */
export function validateGeometryValue(key: GeometryKey, metres: number): string | null {
  if (!Number.isFinite(metres)) return 'must be a finite number';
  const min = geometryMinimum(key);
  if (metres < min) return `must be at least ${min} m`;
  if (metres > CONSTRAINTS.maxLength) return `must not exceed ${CONSTRAINTS.maxLength} m`;
  return null;
}

export function validateJointLimits(minAngle: number, maxAngle: number): string | null {
  if (!Number.isFinite(minAngle) || !Number.isFinite(maxAngle)) {
    return 'joint limits must be finite numbers';
  }
  const bound = CONSTRAINTS.angleBound + LIMIT_TOLERANCE;
  if (minAngle < -bound || maxAngle > bound) return 'joint limits must lie within [-360°, 360°]';
  if (minAngle >= maxAngle) return 'minimum angle must be lower than maximum angle';
  return null;
}

export function isWithinLimits(angle: number, joint: Pick<JointConfig, 'minAngle' | 'maxAngle'>) {
  return angle >= joint.minAngle - LIMIT_TOLERANCE && angle <= joint.maxAngle + LIMIT_TOLERANCE;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function describeLimits(joint: Pick<JointConfig, 'minAngle' | 'maxAngle'>): string {
  return `[${radToDeg(joint.minAngle).toFixed(3)}°, ${radToDeg(joint.maxAngle).toFixed(3)}°]`;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const ROBOT_KEYS = ['model', 'geometry', 'joints', 'displayUnit'];
const GEOMETRY_KEYS: GeometryKey[] = ['baseHeight', 'upperArmLength', 'forearmLength'];
const JOINT_KEYS = ['id', 'name', 'minAngle', 'maxAngle', 'homeAngle', 'angle'];

function unknownKeys(obj: Record<string, unknown>, allowed: string[]): string[] {
  return Object.keys(obj).filter((k) => !allowed.includes(k));
}

/**
 * Structural + domain validation of untrusted data (e.g. an imported file).
 * Returns the typed config when valid.
 */
export function validateRobotConfig(
  value: unknown,
): { ok: true; robot: RobotConfig } | { ok: false; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const push = (field: string, message: string) => issues.push({ field, message });

  if (!isObject(value))
    return { ok: false, issues: [{ field: 'robot', message: 'must be an object' }] };
  for (const key of unknownKeys(value, ROBOT_KEYS)) push(`robot.${key}`, 'unknown field');
  if (value.model !== 'rrr-3dof') push('robot.model', "must be 'rrr-3dof'");
  if (!['m', 'cm', 'mm'].includes(value.displayUnit as string)) {
    push('robot.displayUnit', "must be 'm', 'cm' or 'mm'");
  }

  const geometry = value.geometry;
  if (!isObject(geometry)) {
    push('robot.geometry', 'must be an object');
  } else {
    for (const key of unknownKeys(geometry, GEOMETRY_KEYS))
      push(`geometry.${key}`, 'unknown field');
    for (const key of GEOMETRY_KEYS) {
      const v = geometry[key];
      if (!isFiniteNumber(v)) push(`geometry.${key}`, 'must be a finite number');
      else {
        const err = validateGeometryValue(key, v);
        if (err) push(`geometry.${key}`, err);
      }
    }
  }

  const joints = value.joints;
  if (!Array.isArray(joints) || joints.length !== 3) {
    push('robot.joints', 'exactly 3 joints are required');
  } else {
    joints.forEach((joint: unknown, index) => {
      const prefix = `joints[${index}]`;
      if (!isObject(joint)) return push(prefix, 'must be an object');
      for (const key of unknownKeys(joint, JOINT_KEYS)) push(`${prefix}.${key}`, 'unknown field');
      if (joint.id !== JOINT_IDS[index]) push(`${prefix}.id`, `must be '${JOINT_IDS[index]}'`);
      if (
        typeof joint.name !== 'string' ||
        joint.name.trim().length < 1 ||
        joint.name.length > 60
      ) {
        push(`${prefix}.name`, 'must be a 1-60 character string');
      }
      const nums = ['minAngle', 'maxAngle', 'homeAngle', 'angle'] as const;
      const bad = nums.filter((k) => !isFiniteNumber(joint[k]));
      bad.forEach((k) => push(`${prefix}.${k}`, 'must be a finite number'));
      if (bad.length) return;
      const j = joint as unknown as JointConfig;
      const limitErr = validateJointLimits(j.minAngle, j.maxAngle);
      if (limitErr) return push(prefix, limitErr);
      if (!isWithinLimits(j.angle, j))
        push(`${prefix}.angle`, `outside the joint limits ${describeLimits(j)}`);
      if (!isWithinLimits(j.homeAngle, j)) {
        push(`${prefix}.homeAngle`, `outside the joint limits ${describeLimits(j)}`);
      }
    });
  }

  return issues.length
    ? { ok: false, issues }
    : { ok: true, robot: value as unknown as RobotConfig };
}
