import type { ReceiptData } from '@/features/payments/services/receipts.service';

export const receiptsFixture: ReceiptData[] = ['pay-one', 'pay-two'].map((paymentId, i) => ({
  id: `receipt-${paymentId}`,
  receiptNumber: `CM-2026-${i + 1}`,
  paymentId,
  patientName: `Snapshot paciente ${i + 1}`,
  doctorName: `Snapshot doctor ${i + 1}`,
  doctorDocument: `V-1000000${i}`,
  bankName: 'Banco sintético',
  accountNumber: `000${i}`,
  splitPercentage: '60.00',
  totalConsultation: i === 0 ? '30.25' : '47.50',
  doctorShare: i === 0 ? '18.15' : '28.50',
  centerShare: i === 0 ? '12.10' : '19.00',
  status: 'COMPLETED',
  generatedAt: '2026-10-16T14:00:00.000Z',
  services: [
    {
      serviceId: `snapshot-${i}`,
      serviceName: `Servicio histórico ${i + 1}`,
      specialtyName: 'Especialidad histórica',
      priceUsd: i === 0 ? '30.25' : '47.50',
    },
  ],
  details: [
    {
      paymentMethod: 'ZELLE',
      currency: 'USD',
      amount: i === 0 ? '30.25' : '47.50',
      referenceNumber: `REF-${i}`,
      appliedIgtfAmount: '0.00',
    },
  ],
}));
