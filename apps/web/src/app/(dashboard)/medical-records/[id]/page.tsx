import { notFound } from 'next/navigation';

import { MedicalRecordDetailPanel } from '@/features/medical-records/components/medical-record-detail-panel';

interface MedicalRecordDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MedicalRecordDetailPage({ params }: MedicalRecordDetailPageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  return <MedicalRecordDetailPanel medicalRecordId={id} />;
}
