import { Suspense } from 'react';

import { ConsultationsView } from '@/features/medical-records/components/consultations-view';

export default function ConsultasPage() {
  return (
    <Suspense fallback={<p>Cargando consultas…</p>}>
      <ConsultationsView />
    </Suspense>
  );
}
