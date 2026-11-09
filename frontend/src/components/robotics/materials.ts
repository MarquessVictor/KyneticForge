/** Colours shared by the robot meshes (kept in one place for consistency). */
export const ROBOT_COLORS = {
  link: '#46515e',
  linkHover: '#56626f',
  joint: '#1d232b',
  jointRing: '#8592a1',
  base: '#262d35',
  selected: '#22c3e6',
  effector: '#d9e1e8',
} as const;

export function pickColor(base: string, selected: boolean, hovered: boolean): string {
  if (selected) return ROBOT_COLORS.selected;
  if (hovered) return ROBOT_COLORS.linkHover;
  return base;
}
