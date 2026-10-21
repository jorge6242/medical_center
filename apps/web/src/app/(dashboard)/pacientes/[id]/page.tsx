import { PatientProfile } from '@/features/patients/components/patient-profile';

interface PatientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = await params;
  return <PatientProfile patientId={id} />;
}
