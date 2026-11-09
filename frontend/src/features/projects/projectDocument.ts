import {
  PROJECT_DOCUMENT_FORMAT,
  PROJECT_SCHEMA_VERSION,
  type ProjectDocument,
} from '@/types/project';
import { validateRobotConfig, type ValidationIssue } from '@/utils/validation';

/** Maximum accepted import file size (mirrors the backend limit). */
export const MAX_IMPORT_BYTES = 256 * 1024;

export type ParseResult =
  { ok: true; document: ProjectDocument } | { ok: false; issues: ValidationIssue[] };

const fail = (field: string, message: string): ParseResult => ({
  ok: false,
  issues: [{ field, message }],
});

/**
 * Validate an untrusted project document *before* it is sent to the backend or
 * rendered. The backend validates again on import (it is authoritative).
 */
export function parseProjectDocument(text: string): ParseResult {
  if (text.length > MAX_IMPORT_BYTES) return fail('file', 'file is larger than 256 KiB');

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail('file', 'file is not valid JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return fail('document', 'must be a JSON object');
  }
  const doc = raw as Record<string, unknown>;

  if (doc.format !== PROJECT_DOCUMENT_FORMAT) {
    return fail(
      'format',
      `not a KyneticForge project (expected format '${PROJECT_DOCUMENT_FORMAT}')`,
    );
  }
  const version = doc.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return fail('schemaVersion', 'must be a positive integer');
  }
  if (version > PROJECT_SCHEMA_VERSION) {
    return fail(
      'schemaVersion',
      `document uses schema v${version}, newer than the supported v${PROJECT_SCHEMA_VERSION}`,
    );
  }

  const issues: ValidationIssue[] = [];
  if (typeof doc.appVersion !== 'string')
    issues.push({ field: 'appVersion', message: 'must be a string' });
  if (typeof doc.exportedAt !== 'string' || Number.isNaN(Date.parse(doc.exportedAt))) {
    issues.push({ field: 'exportedAt', message: 'must be an ISO-8601 date' });
  }

  const project = doc.project;
  if (typeof project !== 'object' || project === null || Array.isArray(project)) {
    issues.push({ field: 'project', message: 'must be an object' });
    return { ok: false, issues };
  }
  const body = project as Record<string, unknown>;
  if (typeof body.name !== 'string' || body.name.trim().length < 1 || body.name.length > 120) {
    issues.push({ field: 'project.name', message: 'must be a 1-120 character string' });
  }
  if (
    body.description !== undefined &&
    (typeof body.description !== 'string' || body.description.length > 2000)
  ) {
    issues.push({
      field: 'project.description',
      message: 'must be a string up to 2000 characters',
    });
  }
  const robot = validateRobotConfig(body.robot);
  if (!robot.ok) issues.push(...robot.issues);

  if (issues.length) return { ok: false, issues };
  return {
    ok: true,
    document: {
      ...(doc as unknown as ProjectDocument),
      project: {
        name: (body.name as string).trim(),
        description: (body.description as string | undefined) ?? '',
        robot: (robot as { ok: true; robot: ProjectDocument['project']['robot'] }).robot,
      },
    },
  };
}

/** Safe, filesystem-friendly file name for an exported project. */
export function exportFileName(projectName: string): string {
  const slug = projectName
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'project'}.kfproject.json`;
}
