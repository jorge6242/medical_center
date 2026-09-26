import { DoctorDetailPage } from '@/features/doctors/components/doctor-detail-page';

interface DoctorEditRouteProps {
  params: Promise<{ id: string }>;
}

export default async function DoctorDetailRoute({ params }: DoctorEditRouteProps) {
  const { id } = await params;
  return <DoctorDetailPage doctorId={id} />;
}
