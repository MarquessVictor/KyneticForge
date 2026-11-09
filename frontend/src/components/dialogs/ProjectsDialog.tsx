import { useCallback, useEffect, useState } from 'react';
import { deleteProject, listProjects, renameProject } from '@/features/projects/projectActions';
import { useAppStore } from '@/stores/appStore';
import { useRobotStore } from '@/stores/robotStore';
import type { ProjectSummary } from '@/types/project';
import { Button, IconButton } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Dialog } from '../ui/Dialog';
import { IconEdit, IconTrash } from '../ui/icons';

interface ProjectsDialogProps {
  open: boolean;
  onClose: () => void;
  onOpenProject: (id: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Lists saved projects; open, rename and delete (with confirmation). */
export function ProjectsDialog({ open, onClose, onOpenProject }: ProjectsDialogProps) {
  // Mounted only while open (see TopBar), so the first load starts in the loading state.
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [toDelete, setToDelete] = useState<ProjectSummary | null>(null);
  const currentId = useRobotStore((s) => s.project?.id);
  const backendOnline = useAppStore((s) => s.backendStatus === 'online');

  const applyResult = useCallback((result: ProjectSummary[] | null) => {
    setLoading(false);
    setFailed(result === null);
    setProjects(result ?? []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    applyResult(await listProjects());
  }, [applyResult]);

  useEffect(() => {
    let active = true;
    void listProjects().then((result) => {
      if (active) applyResult(result);
    });
    return () => {
      active = false;
    };
  }, [applyResult]);

  const commitRename = async () => {
    if (!renaming) return;
    const name = renaming.name.trim();
    if (name.length >= 1 && name.length <= 120) await renameProject(renaming.id, name);
    setRenaming(null);
    await refresh();
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await deleteProject(toDelete.id, toDelete.name);
    setToDelete(null);
    await refresh();
  };

  return (
    <>
      <Dialog open={open && !toDelete} title="Projects" onClose={onClose} width="max-w-2xl">
        {!backendOnline && (
          <p className="mb-2 rounded border border-warn/40 bg-warn/10 px-2 py-1 text-xs text-warn">
            The backend is offline. Start it to list and open projects.
          </p>
        )}
        {loading && <p className="text-xs text-ink-400">Loading projects…</p>}
        {!loading && failed && (
          <p className="text-xs text-err">
            Could not load projects. See the event log for details.
          </p>
        )}
        {!loading && !failed && projects?.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-sm text-ink-200">No saved projects yet.</p>
            <p className="mt-1 text-xs text-ink-400">
              Use “New” or “Save” in the top bar to create one.
            </p>
          </div>
        )}
        {!loading && projects && projects.length > 0 && (
          <ul className="divide-y divide-ink-700 rounded border border-ink-700">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  {renaming?.id === p.id ? (
                    <input
                      autoFocus
                      aria-label="New project name"
                      className="kf-input"
                      value={renaming.name}
                      maxLength={120}
                      onChange={(e) => setRenaming({ id: p.id, name: e.target.value })}
                      onBlur={() => void commitRename()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        if (e.key === 'Escape') {
                          e.stopPropagation();
                          setRenaming(null);
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm text-ink-100">{p.name}</span>
                      {p.id === currentId && (
                        <span className="rounded bg-accent-900/50 px-1 text-[10px] text-accent-400">
                          open
                        </span>
                      )}
                    </div>
                  )}
                  <div className="truncate text-[11px] text-ink-400">
                    {p.description || 'No description'} · updated {formatDate(p.updatedAt)}
                  </div>
                </div>
                <IconButton
                  label={`Rename ${p.name}`}
                  onClick={() => setRenaming({ id: p.id, name: p.name })}
                >
                  <IconEdit size={14} />
                </IconButton>
                <IconButton label={`Delete ${p.name}`} onClick={() => setToDelete(p)}>
                  <IconTrash size={14} />
                </IconButton>
                <Button
                  compact
                  variant="primary"
                  onClick={() => onOpenProject(p.id)}
                  disabled={p.id === currentId}
                >
                  Open
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
      <ConfirmDialog
        open={toDelete !== null}
        title="Delete project"
        danger
        confirmLabel="Delete permanently"
        message={
          <>
            Delete <strong className="text-ink-100">{toDelete?.name}</strong>? This removes it from
            the local database and cannot be undone. Export it first if you want to keep a copy.
          </>
        }
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
