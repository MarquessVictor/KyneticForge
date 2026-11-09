import { Grid, Html, Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import type { Vector3Tuple } from 'three';
import { useAppStore } from '@/stores/appStore';
import { DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_TARGET } from './sceneConstants';

const AXES: { label: string; color: string; end: Vector3Tuple }[] = [
  { label: 'X', color: '#e5484d', end: [1, 0, 0] },
  { label: 'Y', color: '#46a758', end: [0, 1, 0] },
  { label: 'Z', color: '#3e8ef7', end: [0, 0, 1] },
];

/** World axes at the origin (X red, Y green, Z blue), length in metres. */
export function WorldAxes({ length = 0.5 }: { length?: number }) {
  return (
    <group name="world-axes">
      {AXES.map(({ label, color, end }) => {
        const tip: Vector3Tuple = [end[0] * length, end[1] * length, end[2] * length];
        return (
          <group key={label}>
            <Line points={[[0, 0, 0], tip]} color={color} lineWidth={1.5} />
            <Html position={tip} center zIndexRange={[10, 0]}>
              <span
                className="pointer-events-none select-none text-[10px] font-semibold"
                style={{ color }}
              >
                {label}
              </span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

/** Ground grid in the world XY plane (Drei's Grid lies in XZ, so it is rotated). */
export function FloorGrid() {
  return (
    <Grid
      rotation={[Math.PI / 2, 0, 0]}
      args={[10, 10]}
      cellSize={0.05}
      cellThickness={0.6}
      cellColor="#1f262e"
      sectionSize={0.25}
      sectionThickness={1}
      sectionColor="#2f3a46"
      fadeDistance={6}
      fadeStrength={1.5}
    />
  );
}

export function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#dfe8f0', '#1a1f25', 0.6]} />
      <directionalLight position={[2.5, -2, 4]} intensity={1.6} />
      <directionalLight position={[-2, 2.5, 1.5]} intensity={0.45} color="#9fc6ff" />
    </>
  );
}

/** Resets the orbit camera whenever `cameraResetToken` changes. */
export function CameraResetter() {
  const token = useAppStore((s) => s.cameraResetToken);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as {
    target: { set: (...v: number[]) => void };
    update: () => void;
  } | null;
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    if (token === 0) return;
    camera.position.set(...DEFAULT_CAMERA_POSITION);
    camera.up.set(0, 0, 1);
    controls?.target.set(...DEFAULT_CAMERA_TARGET);
    controls?.update();
    invalidate();
  }, [token, camera, controls, invalidate]);

  return null;
}
