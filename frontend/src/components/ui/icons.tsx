import type { SVGProps } from 'react';

/** Small, consistent stroke icon set (16px grid, 1.5px stroke). */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 16, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const LogoMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="6" fill="#12161b" stroke="#2c3540" />
    <path
      d="M8 25h16M12 25V20l4-4 6-7"
      fill="none"
      stroke="#22c3e6"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="16" cy="16" r="2.4" fill="#e6edf3" />
    <circle cx="22" cy="9" r="2" fill="#22c3e6" />
  </svg>
);

export const IconNew = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 1.75H4a1.25 1.25 0 0 0-1.25 1.25v10A1.25 1.25 0 0 0 4 14.25h8A1.25 1.25 0 0 0 13.25 13V6L9 1.75Z" />
    <path d="M9 1.75V6h4.25M8 8.5v3.5M6.25 10.25h3.5" />
  </Icon>
);
export const IconOpen = (p: IconProps) => (
  <Icon {...p}>
    <path d="M1.75 4.25V12.5c0 .7.55 1.25 1.25 1.25h10c.7 0 1.25-.55 1.25-1.25V6c0-.7-.55-1.25-1.25-1.25H8L6.5 2.75H3A1.25 1.25 0 0 0 1.75 4v.25Z" />
  </Icon>
);
export const IconSave = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.75 2.75h8.5l2 2v8.5h-10.5z" />
    <path d="M5 2.75v3h5v-3M5 13.25V9.5h6v3.75" />
  </Icon>
);
export const IconImport = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 1.75v8M5 7l3 3 3-3M2.75 10.5v2.75h10.5V10.5" />
  </Icon>
);
export const IconExport = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 10V2M5 4.75l3-3 3 3M2.75 10.5v2.75h10.5V10.5" />
  </Icon>
);
export const IconSettings = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="8" r="2" />
    <path d="M8 1.75v1.5M8 12.75v1.5M14.25 8h-1.5M3.25 8h-1.5M12.4 3.6l-1.06 1.06M4.66 11.34 3.6 12.4M12.4 12.4l-1.06-1.06M4.66 4.66 3.6 3.6" />
  </Icon>
);
export const IconReset = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.75 8a5.25 5.25 0 1 0 1.6-3.77" />
    <path d="M2.5 2.5v3h3" />
  </Icon>
);
export const IconCamera = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 5.5V2.75h2.75M11.25 2.75H14V5.5M14 10.5v2.75h-2.75M4.75 13.25H2V10.5" />
    <circle cx="8" cy="8" r="2.25" />
  </Icon>
);
export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.75 4.25h10.5M6.25 4.25V2.75h3.5v1.5M4 4.25l.6 9h6.8l.6-9M6.75 6.75v4M9.25 6.75v4" />
  </Icon>
);
export const IconEdit = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.5 2.5l3 3L6 13H3v-3l7.5-7.5Z" />
  </Icon>
);
export const IconClose = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.75 3.75l8.5 8.5M12.25 3.75l-8.5 8.5" />
  </Icon>
);
export const IconChevron = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 4l4 4-4 4" />
  </Icon>
);
export const IconJoint = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8" cy="8" r="4.25" />
    <circle cx="8" cy="8" r="1.25" fill="currentColor" />
  </Icon>
);
export const IconLink = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2" y="6.25" width="12" height="3.5" rx="1.75" />
  </Icon>
);
export const IconTool = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 2v5M5 7h6l-1 3H6L5 7ZM6.5 10v4M9.5 10v4" />
  </Icon>
);
export const IconBase = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 13.5h10M5 13.5V9h6v4.5M6.5 9V6.5h3V9" />
  </Icon>
);
export const IconRobot = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 14h6M5 14v-3l3-3 4-4.5" />
    <circle cx="8" cy="8" r="1.25" />
    <circle cx="12" cy="3.5" r="1" />
  </Icon>
);
export const IconWorld = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 13V3M3 13h10M3 13l6-4" />
  </Icon>
);
export const IconHome = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 7.5 8 2.75l5.5 4.75M4 6.5v6.75h8V6.5" />
  </Icon>
);
