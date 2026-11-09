import { ApiError } from '@/services/apiClient';
import { projectsApi } from '@/services/projectsApi';
import { useAppStore } from '@/stores/appStore';
import { log } from '@/stores/logStore';
import { useRobotStore } from '@/stores/robotStore';
import type { Project, ProjectSummary } from '@/types/project';
import { downloadJson } from '@/utils/download';
import { createDefaultRobot } from '../simulator/defaultRobot';
import { exportFileName, parseProjectDocument } from './projectDocument';

/**
 * Project use-cases shared by the top bar and the projects dialog. Each action
 * reports its outcome to the event log and returns whether it succeeded.
 */

function describe(err: unknown): string {
  if (err instanceof ApiError) return err.describe();
  return err instanceof Error ? err.message : String(err);
}

async function run<T>(label: string, task: () => Promise<T>): Promise<T | null> {
  const app = useAppStore.getState();
  app.setBusy(true);
  try {
    return await task();
  } catch (err) {
    log.error(`${label} failed: ${describe(err)}`);
    return null;
  } finally {
    app.setBusy(false);
  }
}

export async function createProject(name: string, description: string): Promise<Project | null> {
  return run('Create project', async () => {
    const project = await projectsApi.create({ name, description, robot: createDefaultRobot() });
    useRobotStore.getState().loadProject(project);
    log.success(`Project "${project.name}" created`);
    return project;
  });
}

/** Save the current robot. Without an open project, `name` is required (save as new). */
export async function saveProject(name?: string, description = ''): Promise<Project | null> {
  const { project, robot } = useRobotStore.getState();
  return run('Save project', async () => {
    const saved = project
      ? await projectsApi.update(project.id, { robot })
      : await projectsApi.create({ name: name ?? 'Untitled project', description, robot });
    useRobotStore.getState().markSaved(saved);
    log.success(`Project "${saved.name}" saved`);
    return saved;
  });
}

export async function openProject(id: string): Promise<Project | null> {
  return run('Open project', async () => {
    const project = await projectsApi.get(id);
    useRobotStore.getState().loadProject(project);
    log.success(`Project "${project.name}" opened`);
    return project;
  });
}

export async function listProjects(): Promise<ProjectSummary[] | null> {
  return run('List projects', () => projectsApi.list());
}

export async function renameProject(id: string, name: string): Promise<Project | null> {
  return run('Rename project', async () => {
    const updated = await projectsApi.update(id, { name });
    const store = useRobotStore.getState();
    if (store.project?.id === id) {
      const { id: pid, name: pname, description, createdAt, updatedAt } = updated;
      store.updateProjectMeta({ id: pid, name: pname, description, createdAt, updatedAt });
    }
    log.success(`Project renamed to "${updated.name}"`);
    return updated;
  });
}

export async function deleteProject(id: string, name: string): Promise<boolean> {
  const result = await run('Delete project', async () => {
    await projectsApi.remove(id);
    const store = useRobotStore.getState();
    if (store.project?.id === id) store.newScratch(store.robot);
    log.success(`Project "${name}" deleted`);
    return true;
  });
  return result ?? false;
}

export async function exportCurrentProject(): Promise<boolean> {
  const { project } = useRobotStore.getState();
  if (!project) {
    log.warning('Save the project before exporting it');
    return false;
  }
  if (useRobotStore.getState().dirty) {
    log.warning('Exporting the last saved version — unsaved changes are not included');
  }
  const result = await run('Export project', async () => {
    const document = await projectsApi.export(project.id);
    const fileName = exportFileName(project.name);
    downloadJson(document, fileName);
    log.success(`Exported "${project.name}" to ${fileName} (schema v${document.schemaVersion})`);
    return true;
  });
  return result ?? false;
}

export async function importProjectFile(text: string, fileName: string): Promise<Project | null> {
  const parsed = parseProjectDocument(text);
  if (!parsed.ok) {
    const details = parsed.issues
      .slice(0, 5)
      .map((i) => `${i.field}: ${i.message}`)
      .join('; ');
    log.error(`Import of ${fileName} rejected — ${details}`);
    return null;
  }
  return run('Import project', async () => {
    const project = await projectsApi.import(parsed.document);
    useRobotStore.getState().loadProject(project);
    log.success(`Imported "${project.name}" from ${fileName}`);
    return project;
  });
}
