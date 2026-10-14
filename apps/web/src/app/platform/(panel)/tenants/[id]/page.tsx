import { PlatformTenantDetail } from '@/features/platform-tenants/components/platform-tenant-detail';

export default async function PlatformTenantPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlatformTenantDetail id={id} />;
}
