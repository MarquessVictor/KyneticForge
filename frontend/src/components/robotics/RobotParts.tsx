import type { ThreeEvent } from '@react-three/fiber';
import { useState } from 'react';
import { useRobotStore } from '@/stores/robotStore';
import type { SelectableId } from '@/types/robot';
import { pickColor, ROBOT_COLORS } from './materials';

/** Hover + click-to-select behaviour shared by every selectable part. */
function useSelectable(id: SelectableId) {
  const selected = useRobotStore((s) => s.selected === id);
  const select = useRobotStore((s) => s.select);
  const [hovered, setHovered] = useState(false);
  const handlers = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      select(id);
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(true);
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      setHovered(false);
      document.body.style.cursor = '';
    },
  };
  return { selected, hovered, handlers };
}

const HALF_PI = Math.PI / 2;

/**
 * Link drawn in its *distal* frame {i}: it spans from the parent joint at
 * (-length, 0, 0) to the frame origin, i.e. along the DH x_i axis.
 */
export function LinkMesh({
  id,
  length,
  radius,
}: {
  id: SelectableId;
  length: number;
  radius: number;
}) {
  const { selected, hovered, handlers } = useSelectable(id);
  return (
    <mesh position={[-length / 2, 0, 0]} rotation={[0, 0, HALF_PI]} castShadow {...handlers}>
      <cylinderGeometry args={[radius, radius * 1.15, length, 32]} />
      <meshStandardMaterial
        color={pickColor(ROBOT_COLORS.link, selected, hovered)}
        metalness={0.55}
        roughness={0.4}
        emissive={selected ? ROBOT_COLORS.selected : '#000000'}
        emissiveIntensity={selected ? 0.25 : 0}
      />
    </mesh>
  );
}

/** Revolute joint housing, aligned with the local z axis (the DH joint axis). */
export function JointMesh({
  id,
  radius,
  width,
}: {
  id: SelectableId;
  radius: number;
  width: number;
}) {
  const { selected, hovered, handlers } = useSelectable(id);
  return (
    <group {...handlers}>
      <mesh rotation={[HALF_PI, 0, 0]} castShadow>
        <cylinderGeometry args={[radius, radius, width, 40]} />
        <meshStandardMaterial
          color={pickColor(ROBOT_COLORS.joint, selected, hovered)}
          metalness={0.6}
          roughness={0.35}
          emissive={selected ? ROBOT_COLORS.selected : '#000000'}
          emissiveIntensity={selected ? 0.35 : 0}
        />
      </mesh>
      {/* Axis indicator ring on both faces */}
      {[1, -1].map((side) => (
        <mesh key={side} position={[0, 0, (side * width) / 2]}>
          <torusGeometry args={[radius * 0.62, radius * 0.06, 8, 40]} />
          <meshBasicMaterial color={selected ? ROBOT_COLORS.selected : ROBOT_COLORS.jointRing} />
        </mesh>
      ))}
    </group>
  );
}

/** Static floor plate and the base yaw joint (J1), drawn in the world frame {0}. */
export function BaseMesh({ radius }: { radius: number }) {
  const plate = useSelectable('base');
  const joint = useSelectable('j1');
  return (
    <group>
      <mesh rotation={[HALF_PI, 0, 0]} position={[0, 0, 0.01]} receiveShadow {...plate.handlers}>
        <cylinderGeometry args={[radius * 1.6, radius * 1.75, 0.02, 48]} />
        <meshStandardMaterial
          color={pickColor(ROBOT_COLORS.base, plate.selected, plate.hovered)}
          metalness={0.4}
          roughness={0.6}
        />
      </mesh>
      <mesh rotation={[HALF_PI, 0, 0]} position={[0, 0, 0.035]} {...joint.handlers}>
        <cylinderGeometry args={[radius * 1.15, radius * 1.15, 0.03, 48]} />
        <meshStandardMaterial
          color={pickColor(ROBOT_COLORS.joint, joint.selected, joint.hovered)}
          metalness={0.6}
          roughness={0.35}
          emissive={joint.selected ? ROBOT_COLORS.selected : '#000000'}
          emissiveIntensity={joint.selected ? 0.35 : 0}
        />
      </mesh>
    </group>
  );
}

/**
 * Turret column, drawn in frame {1}. Frame {1}'s y axis points world-up (α1 = +π/2),
 * so the column spans y ∈ [-L0, 0] and rotates with the base joint.
 */
export function TurretMesh({ height, radius }: { height: number; radius: number }) {
  const { selected, hovered, handlers } = useSelectable('base');
  if (height <= 0) return null;
  return (
    <mesh position={[0, -height / 2, 0]} castShadow {...handlers}>
      <cylinderGeometry args={[radius, radius * 1.1, height, 32]} />
      <meshStandardMaterial
        color={pickColor(ROBOT_COLORS.base, selected, hovered)}
        metalness={0.5}
        roughness={0.45}
      />
    </mesh>
  );
}

/** Simple two-finger tool at the origin of frame {3}, pointing along +x3. */
export function EndEffectorMesh({ size }: { size: number }) {
  const { selected, hovered, handlers } = useSelectable('endEffector');
  const color = selected ? ROBOT_COLORS.selected : hovered ? '#ffffff' : ROBOT_COLORS.effector;
  return (
    <group {...handlers}>
      <mesh>
        <sphereGeometry args={[size * 0.55, 24, 16]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.3} />
      </mesh>
      <mesh position={[size * 0.55, 0, 0]}>
        <boxGeometry args={[size * 0.3, size * 1.6, size * 0.5]} />
        <meshStandardMaterial color={ROBOT_COLORS.joint} metalness={0.6} roughness={0.4} />
      </mesh>
      {[1, -1].map((side) => (
        <mesh key={side} position={[size * 1.1, side * size * 0.62, 0]}>
          <boxGeometry args={[size * 0.9, size * 0.18, size * 0.4]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}
