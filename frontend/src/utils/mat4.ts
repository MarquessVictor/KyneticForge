import type { Mat4, Vec3 } from '@/types/kinematics';

/** Row-major 4x4 matrix helpers, mirroring backend/app/robotics/transforms.py. */

export const IDENTITY: Mat4 = Object.freeze([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

export function at(m: Mat4, row: number, col: number): number {
  return m[row * 4 + col] as number;
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += at(a, r, k) * at(b, k, c);
      out[r * 4 + c] = sum;
    }
  }
  return out;
}

/**
 * Standard Denavit-Hartenberg transform:
 * A = Rot_z(θ) · Trans_z(d) · Trans_x(a) · Rot_x(α).
 */
export function dhTransform(theta: number, d: number, a: number, alpha: number): Mat4 {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);
  return [ct, -st * ca, st * sa, a * ct, st, ct * ca, -ct * sa, a * st, 0, sa, ca, d, 0, 0, 0, 1];
}

export function translationOf(m: Mat4): Vec3 {
  return [at(m, 0, 3), at(m, 1, 3), at(m, 2, 3)];
}

/** Column `col` (0..2) of the rotation block, i.e. a frame axis in parent coordinates. */
export function axisOf(m: Mat4, col: 0 | 1 | 2): Vec3 {
  return [at(m, 0, col), at(m, 1, col), at(m, 2, col)];
}

export function toRows(m: Mat4): number[][] {
  return [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => at(m, r, c)));
}

export function fromRows(rows: readonly (readonly number[])[]): Mat4 {
  return rows.flatMap((row) => [...row]);
}

export function maxAbsDifference(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let max = 0;
  for (let i = 0; i < a.length; i++)
    max = Math.max(max, Math.abs((a[i] as number) - (b[i] as number)));
  return max;
}
