import { PlatformShell } from '@/features/platform-auth/components/platform-shell';

export default function PlatformPanelLayout({ children }: { readonly children: React.ReactNode }) {
  return <PlatformShell>{children}</PlatformShell>;
}
