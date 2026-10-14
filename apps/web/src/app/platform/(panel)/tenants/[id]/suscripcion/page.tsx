import { PlatformSubscriptionPage } from '@/features/platform-subscriptions/components/platform-subscription-page';

export default async function PlatformTenantSubscriptionPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlatformSubscriptionPage tenantId={id} />;
}
