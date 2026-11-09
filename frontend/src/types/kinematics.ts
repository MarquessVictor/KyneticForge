/** 3-vector [x, y, z]. */
export type Vec3 = [number, number, number];

/**
 * 4x4 homogeneous transform stored as a flat, **row-major** array of 16 numbers
 * (same element order as NumPy's `T.flatten()`).
 */
export type Mat4 = readonly number[];

export interface DHParameters {
  theta: number;
  d: number;
  a: number;
  alpha: number;
}

export interface JointState {
  id: 'j1' | 'j2' | 'j3';
  /** World position of the joint (origin of frame {i-1}). */
  position: Vec3;
  /** World direction of the joint's rotation axis (z_{i-1}). */
  axis: Vec3;
}

export interface ForwardKinematicsResult {
  jointAngles: [number, number, number];
  dhTable: [DHParameters, DHParameters, DHParameters];
  /** A_i = T_{i-1,i}. */
  localTransforms: [Mat4, Mat4, Mat4];
  /** T_{0,i}, cumulative world transforms. */
  frames: [Mat4, Mat4, Mat4];
  joints: [JointState, JointState, JointState];
  endEffector: {
    position: Vec3;
    transform: Mat4;
  };
}
