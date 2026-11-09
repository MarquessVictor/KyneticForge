import { Matrix4, type Object3D } from 'three';
import type { Mat4 } from '@/types/kinematics';

/**
 * Bridge between the kinematics module and Three.js.
 *
 * The 3D viewer builds a hierarchy of groups (frame {0} → {1} → {2} → {3}) and
 * each group's *local* matrix is set to the DH transform A_i computed by
 * forwardKinematics(). Three.js composes them exactly like T_0_3 = A1·A2·A3, so
 * the rendered geometry is, by construction, the computed kinematics.
 *
 * The world uses the same Z-up, right-handed convention as the backend
 * (the camera's `up` vector is set to +Z), so no axis remapping is needed.
 */
export function toThreeMatrix(m: Mat4, target: Matrix4 = new Matrix4()): Matrix4 {
  // Matrix4.set() takes arguments in row-major order, same as Mat4.
  return target.set(
    m[0] as number,
    m[1] as number,
    m[2] as number,
    m[3] as number,
    m[4] as number,
    m[5] as number,
    m[6] as number,
    m[7] as number,
    m[8] as number,
    m[9] as number,
    m[10] as number,
    m[11] as number,
    m[12] as number,
    m[13] as number,
    m[14] as number,
    m[15] as number,
  );
}

/** Make `object` use `m` verbatim as its local transform (no position/rotation/scale decomposition). */
export function applyLocalTransform(object: Object3D, m: Mat4): void {
  object.matrixAutoUpdate = false;
  toThreeMatrix(m, object.matrix);
  object.matrixWorldNeedsUpdate = true;
}
