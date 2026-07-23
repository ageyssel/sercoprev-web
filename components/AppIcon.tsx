import type { SVGProps } from 'react'

export type AppIconName =
  | 'alert'
  | 'arrow-right'
  | 'briefcase'
  | 'building'
  | 'calendar'
  | 'check'
  | 'chevron-down'
  | 'clock'
  | 'dashboard'
  | 'document'
  | 'download'
  | 'folder'
  | 'inbox'
  | 'lead'
  | 'menu'
  | 'message'
  | 'money'
  | 'plus'
  | 'search'
  | 'settings'
  | 'shield'
  | 'tasks'
  | 'upload'
  | 'users'
  | 'warning'
  | 'x'

const paths: Record<AppIconName, string[]> = {
  alert: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 7v6', 'M12 17h.01'],
  'arrow-right': ['M5 12h14', 'm13-6 6 6-6 6'],
  briefcase: ['M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2', 'M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z', 'M3 12h18', 'M10 12v2h4v-2'],
  building: ['M4 21h16', 'M6 21V4h12v17', 'M9 8h2', 'M13 8h2', 'M9 12h2', 'M13 12h2', 'M9 16h2', 'M13 16h2'],
  calendar: ['M7 3v4', 'M17 3v4', 'M4 9h16', 'M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z', 'M8 13h3', 'M13 13h3', 'M8 17h3'],
  check: ['m5 12 4 4L19 6'],
  'chevron-down': ['m6 9 6 6 6-6'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 6v6l4 2'],
  dashboard: ['M4 13h6V4H4v9Z', 'M14 20h6v-9h-6v9Z', 'M14 4h6v3h-6V4Z', 'M4 17h6v3H4v-3Z'],
  document: ['M6 2h8l4 4v16H6V2Z', 'M14 2v5h5', 'M9 13h6', 'M9 17h6', 'M9 9h2'],
  download: ['M12 3v12', 'm7 10 5 5 5-5', 'M5 21h14'],
  folder: ['M3 6h7l2 2h9v12H3V6Z'],
  inbox: ['M4 4h16v16H4V4Z', 'M4 14h4l2 3h4l2-3h4'],
  lead: ['M12 3v3', 'M5.64 5.64 7.76 7.76', 'M3 12h3', 'M18 12h3', 'm16.24 7.76 2.12-2.12', 'M9 18h6', 'M10 22h4', 'M8 12a4 4 0 1 1 8 0c0 1.5-.8 2.5-1.7 3.4-.7.7-1.3 1.4-1.3 2.6h-2c0-1.2-.6-1.9-1.3-2.6C8.8 14.5 8 13.5 8 12Z'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  message: ['M4 4h16v13H8l-4 4V4Z', 'M8 9h8', 'M8 13h5'],
  money: ['M12 2v20', 'M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6'],
  plus: ['M12 5v14', 'M5 12h14'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'm21 21-4.35-4.35'],
  settings: ['M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 3.67-.08-.02a1.7 1.7 0 0 0-1.8-.28l-.4.23a1.7 1.7 0 0 0-.86 1.68V22H10.3v-.1a1.7 1.7 0 0 0-.86-1.48l-.4-.23a1.7 1.7 0 0 0-1.8.28l-.08.02-2.12-3.67.06-.06A1.7 1.7 0 0 0 5.44 15v-.46a1.7 1.7 0 0 0-1.2-1.6L4.1 12.9V8.66l.14-.04a1.7 1.7 0 0 0 1.2-1.6v-.46A1.7 1.7 0 0 0 5.1 4.68l-.06-.06L7.16.95l.08.02a1.7 1.7 0 0 0 1.8.28l.4-.23A1.7 1.7 0 0 0 10.3-.46V-.5h4.24v.1a1.7 1.7 0 0 0 .86 1.48l.4.23a1.7 1.7 0 0 0 1.8-.28l.08-.02 2.12 3.67-.06.06a1.7 1.7 0 0 0-.34 1.88v.46a1.7 1.7 0 0 0 1.2 1.6l.14.04v4.24l-.14.04a1.7 1.7 0 0 0-1.2 1.6V15Z'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z', 'm9 12 2 2 4-4'],
  tasks: ['M9 6h11', 'M9 12h11', 'M9 18h11', 'm3 6 1 1 2-2', 'm3 12 1 1 2-2', 'm3 18 1 1 2-2'],
  upload: ['M12 21V9', 'm7 14 5-5 5 5', 'M5 3h14'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  warning: ['M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z', 'M12 9v4', 'M12 17h.01'],
  x: ['M6 6l12 12', 'M18 6 6 18'],
}

export function AppIcon({
  name,
  className = 'h-5 w-5',
  ...props
}: SVGProps<SVGSVGElement> & { name: AppIconName }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}>
      {paths[name].map((path, index) => <path key={`${name}-${index}`} d={path} />)}
    </svg>
  )
}
