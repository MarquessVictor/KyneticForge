import type { RobotConfig } from '@/types/robot';
import { degToRad } from '@/utils/units';

/**
 * Default 3-DOF arm, identical to backend/app/robotics/presets.py
 * (checked by defaultRobot.test.ts against the shared fixture). Used when no
 * project is open or the backend is unreachable.
 */
export function createDefaultRobot(): RobotConfig {
  return {
    model: 'rrr-3dof',
    geometry: { baseHeight: 0.3, upperArmLength: 0.4, forearmLength: 0.3 },
    joints: [
      {
        id: 'j1',
        name: 'Base',
        minAngle: degToRad(-180),
        maxAngle: degToRad(180),
        homeAngle: degToRad(30),
        angle: degToRad(30),
      },
      {
        id: 'j2',
        name: 'Shoulder',
        minAngle: degToRad(-45),
        maxAngle: degToRad(135),
        homeAngle: degToRad(60),
        angle: degToRad(60),
      },
      {
        id: 'j3',
        name: 'Elbow',
        minAngle: degToRad(-150),
        maxAngle: degToRad(150),
        homeAngle: degToRad(-75),
        angle: degToRad(-75),
      },
    ],
    displayUnit: 'm',
  };
}
