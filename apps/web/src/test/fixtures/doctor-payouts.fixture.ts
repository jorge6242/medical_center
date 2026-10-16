import type {
  DoctorPayout,
  DoctorPayoutDetail,
} from '@/features/doctor-payouts/services/doctor-payouts.service';

export const doctorPayoutsFixture: DoctorPayout[] = ['one', 'two', 'void'].map((id) => ({
  id,
  doctorId: `doctor-${id}`,
  doctorName: `Profesional ${id}`,
  status: id === 'void' ? 'VOIDED' : 'COMPLETED',
  paymentMethod: 'PAGO_MOVIL',
  currency: 'VES',
  amountUsd: id === 'one' ? '25.00' : '40.00',
  paidAmount: '1000.00',
  bcvExchangeRate: '40.0000',
  equivalentBs: '1000.00',
  referenceNumber: `ref-${id}`,
  bankName: `Banco histórico ${id}`,
  accountNumber: null,
  bankPhone: '04120000000',
  createdAt: '2026-10-16T12:00:00Z',
  voidReason: id === 'void' ? 'Duplicado' : null,
  items: [
    {
      paymentId: `payment-${id}`,
      totalConsultationUsd: '50.00',
      doctorShareUsd: '25.00',
    },
  ],
}));

export const pendingPayoutFixture = (id = 'doctor-ana') => ({
  doctor: {
    id,
    name: `Pendiente ${id}`,
    splitPercentage: '50.00',
    bankName: `Banco ${id}`,
    accountNumber: null,
    bankPhone: '04120000000',
  },
  payments: ['first', 'second'].map((key, index) => ({
    id: key,
    createdAt: '2026-10-16T12:00:00Z',
    consultationDate: null,
    description: `Consulta ${key}`,
    patientName: `Paciente ${key}`,
    totalConsultationUsd: '50.00',
    doctorShareUsd: index ? '15.00' : '25.00',
  })),
  totals: { totalConsultationUsd: '100.00', totalDoctorShareUsd: '40.00' },
});

export const payoutDetailsFixture: DoctorPayoutDetail[] = doctorPayoutsFixture.map((payout) => ({
  ...payout,
  doctorDocument: `V-${payout.id}`,
  items: [
    {
      paymentId: `payment-${payout.id}`,
      consultationDate: null,
      patientName: `Histórico ${payout.id}`,
      patientDocument: `V-patient-${payout.id}`,
      description: `Descripción ${payout.id}`,
      services:
        payout.id === 'void'
          ? []
          : [
              {
                serviceName: `Servicio histórico ${payout.id}`,
                specialtyName: `Especialidad histórica ${payout.id}`,
              },
            ],
    },
  ],
}));
