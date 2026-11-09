import type { Project, ProjectDocument, ProjectSummary } from '@/types/project';
import type { RobotConfig } from '@/types/robot';
import { apiRequest } from './apiClient';

export const projectsApi = {
  list: () => apiRequest<ProjectSummary[]>('/projects'),
  get: (id: string) => apiRequest<Project>(`/projects/${encodeURIComponent(id)}`),
  create: (data: { name: string; description?: string; robot?: RobotConfig }) =>
    apiRequest<Project>('/projects', { method: 'POST', body: data }),
  update: (id: string, data: { name?: string; description?: string; robot?: RobotConfig }) =>
    apiRequest<Project>(`/projects/${encodeURIComponent(id)}`, { method: 'PATCH', body: data }),
  remove: (id: string) =>
    apiRequest<undefined>(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  export: (id: string) => apiRequest<ProjectDocument>(`/projects/${encodeURIComponent(id)}/export`),
  import: (document: ProjectDocument) =>
    apiRequest<Project>('/projects/import', { method: 'POST', body: document }),
};
