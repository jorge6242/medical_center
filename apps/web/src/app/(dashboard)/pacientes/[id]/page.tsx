import { PatientMedicalRecordsPanel } from '@/features/medical-records/components/patient-medical-records-panel';

interface PatientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Detalle del paciente</h1>
        <p className="text-sm text-on-surface-variant">ID: {id}</p>
      </div>

      <PatientMedicalRecordsPanel patientId={id} />
    </div>
  );
}
