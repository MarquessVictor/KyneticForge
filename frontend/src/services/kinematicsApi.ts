import type { AngleTriple, ArmGeometry, RobotConfig } from '@/types/robot';
import { apiRequest } from './apiClient';

export interface ForwardKinematicsResponse {
  jointAngles: number[];
  dhTable: { theta: number; d: number; a: number; alpha: number }[];
  localTransforms: number[][][];
  frames: number[][][];
  joints: { id: string; position: number[]; axis: number[] }[];
  endEffector: { position: number[]; rotation: number[][]; transform: number[][] };
}

export interface ValidationReport {
  valid: boolean;
  issues: { field: string; message: string; severity: 'error' | 'warning' }[];
}

export interface HealthResponse {
  status: string;
  name: string;
  version: string;
}

export const kinematicsApi = {
  forward: (
    geometry: ArmGeometry,
    jointAngles: AngleTriple,
    jointLimits?: { minAngle: number; maxAngle: number }[],
    signal?: AbortSignal,
  ) =>
    apiRequest<ForwardKinematicsResponse>('/kinematics/forward', {
      method: 'POST',
      body: { geometry, jointAngles, ...(jointLimits ? { jointLimits } : {}) },
      ...(signal ? { signal } : {}),
    }),
  validate: (robot: RobotConfig) =>
    apiRequest<ValidationReport>('/robotics/validate', { method: 'POST', body: robot }),
};

export const systemApi = {
  health: (signal?: AbortSignal) => apiRequest<HealthResponse>('/health', signal ? { signal } : {}),
};
