import React from 'react';

interface IconProps {
  path: string;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ path, size = 16, strokeWidth = 2 }: IconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={path}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
