import { describe, expect, it } from 'vitest';
import { createDefaultRobot } from '@/features/simulator/defaultRobot';
import { exportFileName, MAX_IMPORT_BYTES, parseProjectDocument } from './projectDocument';

function doc(overrides: Record<string, unknown> = {}) {
  return {
    format: 'kyneticforge.project',
    schemaVersion: 1,
    appVersion: '0.1.0',
    exportedAt: '2026-01-01T00:00:00Z',
    project: { name: 'Cell A', description: 'demo', robot: createDefaultRobot() },
    ...overrides,
  };
}

describe('parseProjectDocument', () => {
  it('accepts a valid document', () => {
    const result = parseProjectDocument(JSON.stringify(doc()));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.document.project.name).toBe('Cell A');
  });

  it('rejects malformed JSON', () => {
    const result = parseProjectDocument('{ nope');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]!.message).toMatch(/not valid JSON/);
  });

  it('rejects other formats', () => {
    expect(parseProjectDocument(JSON.stringify(doc({ format: 'other' }))).ok).toBe(false);
    expect(parseProjectDocument('[1,2]').ok).toBe(false);
  });

  it('rejects newer schema versions with a clear message', () => {
    const result = parseProjectDocument(JSON.stringify(doc({ schemaVersion: 2 })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]!.message).toMatch(/newer than the supported v1/);
  });

  it('rejects an invalid robot', () => {
    const robot = createDefaultRobot();
    robot.geometry.upperArmLength = 0;
    const result = parseProjectDocument(
      JSON.stringify(doc({ project: { name: 'x', description: '', robot } })),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((i) => i.field)).toContain('geometry.upperArmLength');
  });

  it('rejects oversized files', () => {
    expect(parseProjectDocument('x'.repeat(MAX_IMPORT_BYTES + 1)).ok).toBe(false);
  });

  it('rejects missing project names', () => {
    const result = parseProjectDocument(
      JSON.stringify(doc({ project: { name: ' ', robot: createDefaultRobot() } })),
    );
    expect(result.ok).toBe(false);
  });
});

describe('exportFileName', () => {
  it('creates a safe slug', () => {
    expect(exportFileName('Célula de Montagem #1')).toBe('celula-de-montagem-1.kfproject.json');
    expect(exportFileName('../../etc')).toBe('etc.kfproject.json');
    expect(exportFileName('***')).toBe('project.kfproject.json');
  });
});
