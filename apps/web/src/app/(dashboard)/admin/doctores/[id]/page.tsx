import { DoctorEditPage } from '@/features/doctors/components/doctor-edit-page';

interface DoctorEditRouteProps {
  params: Promise<{ id: string }>;
}

export default async function DoctorEditRoute({ params }: DoctorEditRouteProps) {
  const { id } = await params;
  return <DoctorEditPage doctorId={id} />;
}
