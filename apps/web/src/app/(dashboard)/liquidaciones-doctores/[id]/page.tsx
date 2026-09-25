import { notFound } from 'next/navigation';

import { DoctorPayoutDetailPanel } from '@/features/doctor-payouts/components/doctor-payout-detail-panel';

interface DoctorPayoutDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DoctorPayoutDetailPage({ params }: DoctorPayoutDetailPageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  return <DoctorPayoutDetailPanel payoutId={id} />;
}
