import { useRef, useState, type ChangeEvent } from 'react';
import {
  createProject,
  exportCurrentProject,
  importProjectFile,
  openProject,
  saveProject,
} from '@/features/projects/projectActions';
import { MAX_IMPORT_BYTES } from '@/features/projects/projectDocument';
import { useAppStore } from '@/stores/appStore';
import { log } from '@/stores/logStore';
import { useRobotStore } from '@/stores/robotStore';
import { ProjectFormDialog } from '../dialogs/ProjectFormDialog';
import { ProjectsDialog } from '../dialogs/ProjectsDialog';
import { SettingsDialog } from '../dialogs/SettingsDialog';
import { Button, IconButton } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  IconExport,
  IconImport,
  IconNew,
  IconOpen,
  IconSave,
  IconSettings,
  LogoMark,
} from '../ui/icons';
import { StatusIndicator } from './StatusIndicator';

type FormMode = 'new' | 'saveAs' | null;

export function TopBar() {
  const project = useRobotStore((s) => s.project);
  const dirty = useRobotStore((s) => s.dirty);
  const online = useAppStore((s) => s.backendStatus === 'online');
  const busy = useAppStore((s) => s.busy);

  const [form, setForm] = useState<FormMode>(null);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pending, setPending] = useState<{ label: string; run: () => void } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  /** Ask before an action that would discard unsaved changes. */
  const guard = (label: string, run: () => void) => {
    if (useRobotStore.getState().dirty) setPending({ label, run });
    else run();
  };

  const onSave = () => {
    if (project) void saveProject();
    else setForm('saveAs');
  };

  const onFormSubmit = async (name: string, description: string) => {
    const result =
      form === 'new'
        ? await createProject(name, description)
        : await saveProject(name, description);
    if (result) setForm(null);
  };

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      log.error(`Import of ${file.name} rejected — file is larger than 256 KiB`);
      return;
    }
    const text = await file.text();
    guard('import a project', () => void importProjectFile(text, file.name));
  };

  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-ink-700 bg-ink-900 px-3">
      <div className="flex items-center gap-2">
        <LogoMark />
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight">KyneticForge Studio</div>
          <div className="text-[10px] text-ink-400">Robotics engineering · v{__APP_VERSION__}</div>
        </div>
      </div>

      <span className="h-6 w-px bg-ink-700" />

      <div className="flex min-w-0 items-center gap-2" aria-label="Current project">
        <span className="truncate text-xs text-ink-100" data-testid="project-name">
          {project ? project.name : 'Untitled (unsaved)'}
        </span>
        {dirty && (
          <span className="flex items-center gap-1 text-[11px] text-warn" title="Unsaved changes">
            <span className="h-1.5 w-1.5 rounded-full bg-warn" /> modified
          </span>
        )}
      </div>

      <nav className="ml-auto flex items-center gap-1" aria-label="Project actions">
        <Button
          variant="ghost"
          icon={<IconNew />}
          onClick={() => guard('create a new project', () => setForm('new'))}
          disabled={!online || busy}
        >
          New
        </Button>
        <Button
          variant="ghost"
          icon={<IconOpen />}
          onClick={() => setProjectsOpen(true)}
          disabled={busy}
        >
          Open
        </Button>
        <Button
          variant="ghost"
          icon={<IconSave />}
          onClick={onSave}
          disabled={!online || busy || (!!project && !dirty)}
        >
          Save
        </Button>
        <span className="mx-1 h-5 w-px bg-ink-700" />
        <Button
          variant="ghost"
          icon={<IconImport />}
          onClick={() => fileInput.current?.click()}
          disabled={!online || busy}
        >
          Import
        </Button>
        <Button
          variant="ghost"
          icon={<IconExport />}
          onClick={() => void exportCurrentProject()}
          disabled={!online || busy || !project}
        >
          Export
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-label="Import project file"
          onChange={(e) => void onImportFile(e)}
        />
        <span className="mx-1 h-5 w-px bg-ink-700" />
        <IconButton label="Settings" onClick={() => setSettingsOpen(true)}>
          <IconSettings />
        </IconButton>
        <StatusIndicator />
      </nav>

      {form !== null && (
        <ProjectFormDialog
          key={form}
          open
          title={form === 'new' ? 'New project' : 'Save project'}
          submitLabel={form === 'new' ? 'Create' : 'Save'}
          initialName={form === 'new' ? '' : 'Untitled project'}
          busy={busy}
          onSubmit={(n, d) => void onFormSubmit(n, d)}
          onClose={() => setForm(null)}
        />
      )}
      {projectsOpen && (
        <ProjectsDialog
          open
          onClose={() => setProjectsOpen(false)}
          onOpenProject={(id) =>
            guard('open another project', () => {
              setProjectsOpen(false);
              void openProject(id);
            })
          }
        />
      )}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ConfirmDialog
        open={pending !== null}
        title="Unsaved changes"
        confirmLabel="Discard changes"
        danger
        message={`The current robot has unsaved changes. Discard them and ${pending?.label ?? 'continue'}?`}
        onConfirm={() => {
          const action = pending;
          setPending(null);
          action?.run();
        }}
        onCancel={() => setPending(null)}
      />
    </header>
  );
}
