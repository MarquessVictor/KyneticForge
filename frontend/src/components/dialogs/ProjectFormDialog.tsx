import { useId, useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

interface ProjectFormDialogProps {
  open: boolean;
  title: string;
  submitLabel: string;
  initialName?: string;
  busy?: boolean;
  onSubmit: (name: string, description: string) => void;
  onClose: () => void;
}

/** Name + description form used by "New project" and "Save as". */
export function ProjectFormDialog({
  open,
  title,
  submitLabel,
  initialName = '',
  busy = false,
  onSubmit,
  onClose,
}: ProjectFormDialogProps) {
  const nameId = useId();
  const descId = useId();
  // Mounted fresh each time it opens (see TopBar), so initial state is the reset state.
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState('');

  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= 120;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid) onSubmit(trimmed, description.trim());
  };

  return (
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      width="max-w-md"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="project-form" disabled={!valid || busy}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={submit} className="flex flex-col gap-3">
        <div>
          <label htmlFor={nameId} className="kf-label mb-1 block">
            Project name
          </label>
          <input
            id={nameId}
            className="kf-input"
            value={name}
            maxLength={120}
            placeholder="e.g. Pick-and-place cell A"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={descId} className="kf-label mb-1 block">
            Description <span className="normal-case text-ink-500">(optional)</span>
          </label>
          <textarea
            id={descId}
            className="kf-input h-20 resize-none py-1"
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </form>
    </Dialog>
  );
}
