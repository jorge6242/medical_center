import type { SpecialtyResponse } from '@/features/specialties/services/specialties.service';

export const specialtiesFixture: SpecialtyResponse[] = [
  { id: 'spec-cardio', name: 'Cardiología', isActive: true },
  { id: 'spec-pediatria', name: 'Pediatría', isActive: true },
];

interface SpecialtyDoctorsFixture {
  specialty: { id: string; name: string };
  doctors: Array<{
    id: string;
    name: string;
    services: Array<{ id: string; name: string; priceUsd: string }>;
  }>;
}

export const cardioDoctorsFixture: SpecialtyDoctorsFixture = {
  specialty: { id: 'spec-cardio', name: 'Cardiología' },
  doctors: [
    {
      id: 'doc-ana',
      name: 'Dra. Ana Pérez',
      services: [{ id: 'svc-eco', name: 'Ecocardiograma', priceUsd: '80.00' }],
    },
  ],
};

export const pediatriaDoctorsFixture: SpecialtyDoctorsFixture = {
  specialty: { id: 'spec-pediatria', name: 'Pediatría' },
  doctors: [
    {
      id: 'doc-luis',
      name: 'Dr. Luis Mora',
      services: [{ id: 'svc-cons-ped', name: 'Consulta pediátrica', priceUsd: '40.00' }],
    },
  ],
};
