import type { RobotConfig } from './robot';

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project extends ProjectSummary {
  schemaVersion: number;
  robot: RobotConfig;
}

export const PROJECT_DOCUMENT_FORMAT = 'kyneticforge.project';
/** Highest project document schema version this build understands. */
export const PROJECT_SCHEMA_VERSION = 1;

export interface ProjectDocument {
  format: typeof PROJECT_DOCUMENT_FORMAT;
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  project: {
    name: string;
    description: string;
    robot: RobotConfig;
  };
}
