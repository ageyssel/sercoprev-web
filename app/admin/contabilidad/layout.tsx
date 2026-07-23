import { MacroModuleNav } from '@/components/admin/MacroModuleNav'

export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <MacroModuleNav module="accounting" />
      {children}
    </div>
  )
}
