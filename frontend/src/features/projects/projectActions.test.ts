import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultRobot } from '@/features/simulator/defaultRobot';
import { useLogStore } from '@/stores/logStore';
import { useRobotStore } from '@/stores/robotStore';
import type { Project } from '@/types/project';
import { importProjectFile, openProject, saveProject } from './projectActions';

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    name: 'Saved',
    description: '',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    schemaVersion: 1,
    robot: createDefaultRobot(),
    ...overrides,
  };
}

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  useRobotStore.getState().newScratch();
  useLogStore.getState().clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('project actions', () => {
  it('saves an unsaved robot as a new project (POST) and clears dirty', async () => {
    useRobotStore.getState().setJointAngle('j1', 0.25);
    const fetchMock = mockFetch(201, project({ name: 'Cell' }));
    const saved = await saveProject('Cell', 'desc');
    expect(saved?.name).toBe('Cell');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/projects');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string).robot.joints[0].angle).toBe(0.25);
    expect(useRobotStore.getState().dirty).toBe(false);
  });

  it('updates an open project with PATCH', async () => {
    useRobotStore.getState().loadProject(project());
    useRobotStore.getState().setJointAngle('j2', 0.1);
    const fetchMock = mockFetch(200, project());
    await saveProject();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/projects/p1');
    expect(init.method).toBe('PATCH');
  });

  it('logs backend validation errors and keeps local state', async () => {
    mockFetch(422, {
      error: {
        code: 'validation_error',
        message: 'request validation failed',
        details: [{ loc: ['body', 'name'], message: 'too long' }],
      },
    });
    const result = await saveProject('x');
    expect(result).toBeNull();
    const last = useLogStore.getState().entries.at(-1);
    expect(last?.level).toBe('error');
    expect(last?.message).toMatch(/body\.name: too long/);
  });

  it('reports an unreachable backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    expect(await openProject('p1')).toBeNull();
    expect(useLogStore.getState().entries.at(-1)?.message).toMatch(/unreachable/);
  });

  it('refuses to send an invalid import file to the backend', async () => {
    const fetchMock = mockFetch(201, project());
    expect(await importProjectFile('{"format":"x"}', 'bad.json')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useLogStore.getState().entries.at(-1)?.message).toMatch(/bad\.json rejected/);
  });

  it('imports a valid file and loads the created project', async () => {
    const created = project({ id: 'p2', name: 'Imported' });
    mockFetch(201, created);
    const text = JSON.stringify({
      format: 'kyneticforge.project',
      schemaVersion: 1,
      appVersion: '0.1.0',
      exportedAt: '2026-01-01T00:00:00Z',
      project: { name: 'Imported', description: '', robot: createDefaultRobot() },
    });
    expect((await importProjectFile(text, 'ok.json'))?.id).toBe('p2');
    expect(useRobotStore.getState().project?.id).toBe('p2');
  });
});
