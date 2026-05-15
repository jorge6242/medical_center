import { AuthHydrator } from '@/features/auth/components/auth-hydrator';
import { ReportExportSidebar } from '@/features/reports/components/report-export-sidebar';
import { Sidebar } from '@/shared/components/ui/sidebar';
import { Topbar } from '@/shared/components/ui/topbar';

export default function DashboardLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-variant">
      <AuthHydrator />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
          <ReportExportSidebar />
        </div>
      </div>
    </div>
  );
}
