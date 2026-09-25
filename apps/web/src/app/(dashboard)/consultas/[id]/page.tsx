import { notFound } from 'next/navigation';

import { ConsultationDetailPanel } from '@/features/consultations/components/consultation-detail-panel';

interface ConsultationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ConsultationDetailPage({ params }: ConsultationDetailPageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  return <ConsultationDetailPanel consultationId={id} />;
}
