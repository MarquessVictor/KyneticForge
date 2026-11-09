import { useThree } from '@react-three/fiber';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import { applyLocalTransform } from '@/features/kinematics/sceneTransforms';
import type { Mat4 } from '@/types/kinematics';

interface FrameGroupProps {
  /** Local transform A_i relative to the parent frame (row-major). */
  matrix: Mat4;
  name: string;
  children?: ReactNode;
}

/**
 * A kinematic frame in the scene graph. Its local matrix is the DH transform
 * computed by the kinematics module — never an independently animated value.
 */
export function FrameGroup({ matrix, name, children }: FrameGroupProps) {
  const ref = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    if (!ref.current) return;
    applyLocalTransform(ref.current, matrix);
    invalidate();
  }, [matrix, invalidate]);

  return (
    <group ref={ref} name={name} matrixAutoUpdate={false}>
      {children}
    </group>
  );
}
