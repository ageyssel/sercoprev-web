import type { ReactNode } from 'react'

type IconName =
  | 'message-circle'
  | 'shield-check'
  | 'user-check'
  | 'gavel'
  | 'file-text'
  | 'chevron-right'
  | 'play-circle'
  | 'star'
  | 'shield-alert'
  | 'user-plus'
  | 'database'
  | 'building'
  | 'download'
  | 'upload'

const ICON_PATHS: Record<IconName, ReactNode> = {
  'message-circle': <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.7-5.1A8 8 0 1 1 21 15Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></>,
  'shield-check': <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>,
  'user-check': <><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a6 6 0 0 1 6-6h2" /><path d="m16 17 2 2 4-4" /></>,
  gavel: <><path d="m14 13-6-6" /><path d="m5 10 6-6 4 4-6 6Z" /><path d="m13 14 6-6 2 2-6 6Z" /><path d="M2 22h12" /></>,
  'file-text': <><path d="M6 2h8l4 4v16H6Z" /><path d="M14 2v5h5" /><path d="M9 13h6M9 17h6M9 9h2" /></>,
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  'play-circle': <><circle cx="12" cy="12" r="10" /><path d="m10 8 6 4-6 4Z" /></>,
  star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2l-5-4.9 6.9-1Z" />,
  'shield-alert': <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="M12 8v5M12 17h.01" /></>,
  'user-plus': <><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a6 6 0 0 1 6-6h6" /><path d="M19 8v6M16 11h6" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" /></>,
  building: <><path d="M3 22V4h12v18M15 9h6v13M7 8h4M7 12h4M7 16h4M18 13h1M18 17h1M2 22h20" /></>,
  download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></>,
  upload: <><path d="M12 21V9" /><path d="m7 14 5-5 5 5" /><path d="M4 3h16" /></>,
}

export function SimpleIcon({
  name,
  className = 'h-5 w-5',
  title,
}: {
  name: IconName
  className?: string
  title?: string
}) {
  const isStar = name === 'star'

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={isStar ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {ICON_PATHS[name]}
    </svg>
  )
}
