import { MacroModuleNav } from '@/components/admin/MacroModuleNav'

export default function PayrollLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <MacroModuleNav module="payroll" />
      {children}
    </div>
  )
}
