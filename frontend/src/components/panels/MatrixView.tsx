import type { Mat4 } from '@/types/kinematics';
import { toRows } from '@/utils/mat4';
import { formatNumber } from '@/utils/units';

interface MatrixViewProps {
  label: string;
  caption?: string;
  matrix: Mat4;
  decimals?: number;
}

/** 4x4 homogeneous matrix; the translation column is tinted, units in metres. */
export function MatrixView({ label, caption, matrix, decimals = 4 }: MatrixViewProps) {
  const rows = toRows(matrix);
  return (
    <figure className="rounded border border-ink-700 bg-ink-900 p-2">
      <figcaption className="mb-1 flex items-baseline justify-between">
        <span className="kf-mono text-xs text-ink-100">{label}</span>
        {caption && <span className="text-[10px] text-ink-400">{caption}</span>}
      </figcaption>
      <table className="kf-mono w-full border-separate border-spacing-x-1 text-right text-[11px]">
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((v, c) => (
                <td
                  key={c}
                  className={
                    c === 3 && r < 3 ? 'text-accent-400' : r === 3 ? 'text-ink-500' : 'text-ink-200'
                  }
                >
                  {formatNumber(v, decimals)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
