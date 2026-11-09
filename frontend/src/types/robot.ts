/**
 * Robot configuration types. All lengths are metres and all angles radians (SI);
 * conversion to display units happens only in UI components.
 */

export type RobotModel = 'rrr-3dof';
export type LengthUnit = 'm' | 'cm' | 'mm';
export type JointId = 'j1' | 'j2' | 'j3';

export const JOINT_IDS: readonly JointId[] = ['j1', 'j2', 'j3'] as const;

export interface ArmGeometry {
  /** Floor to shoulder axis, L0 (m). */
  baseHeight: number;
  /** Shoulder to elbow, L1 (m). */
  upperArmLength: number;
  /** Elbow to end effector, L2 (m). */
  forearmLength: number;
}

export interface JointConfig {
  id: JointId;
  name: string;
  minAngle: number;
  maxAngle: number;
  /** Initial ("home") position. */
  homeAngle: number;
  /** Current position. */
  angle: number;
}

export type JointTriple = [JointConfig, JointConfig, JointConfig];
export type AngleTriple = [number, number, number];

export interface RobotConfig {
  model: RobotModel;
  geometry: ArmGeometry;
  joints: JointTriple;
  displayUnit: LengthUnit;
}

/** Identifiers of selectable scene/tree elements. */
export type SelectableId = 'robot' | 'base' | 'link1' | 'link2' | 'endEffector' | JointId;
