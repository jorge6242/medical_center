import { DEMO_TENANT_ID } from './types';

import type { Doctor, Patient, PrismaClient, User, Consultation } from '@prisma/client';


export async function seedDemoConsultations(
  prisma: PrismaClient,
  doctors: Doctor[],
  patients: Patient[],
  users: { admin: User; reception: User },
): Promise<Consultation[]> {
  await prisma.consultationService.deleteMany({ where: { consultation: { tenantId: DEMO_TENANT_ID } } });
  await prisma.doctorReceipt.deleteMany({ where: { payment: { tenantId: DEMO_TENANT_ID } } });
  await prisma.paymentAdjustment.deleteMany({ where: { payment: { tenantId: DEMO_TENANT_ID } } });
  await prisma.paymentDetail.deleteMany({ where: { payment: { tenantId: DEMO_TENANT_ID } } });
  await prisma.paymentItem.deleteMany({ where: { payment: { tenantId: DEMO_TENANT_ID } } });
  await prisma.consultationPayment.deleteMany({ where: { consultation: { tenantId: DEMO_TENANT_ID } } });
  await prisma.payment.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
  await prisma.consultation.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });

  const today = new Date();
  const now = new Date();
  const consultations: Consultation[] = [];

  const [doctor1, doctor2, doctor3, doctor4] = doctors;
  const [patient1, patient2, patient3, patient4, patient5, patient6, patient7, patient8, patient9, patient10] = patients;

  if (!doctor1 || !doctor2 || !doctor3 || !doctor4) {
    throw new Error('Demo doctors insufficientes');
  }
  if (!patient1 || !patient2 || !patient3 || !patient4 || !patient5 || !patient6 || !patient7 || !patient8 || !patient9 || !patient10) {
    throw new Error('Demo patients insufficientes');
  }

  const flow: Array<{
    doctor: Doctor;
    patient: Patient;
    status: 'PAID' | 'VOIDED';
    offsetDays: number;
  }> = [
    { doctor: doctor1, patient: patient1, status: 'PAID', offsetDays: 0 },
    { doctor: doctor1, patient: patient2, status: 'PAID', offsetDays: 0 },
    { doctor: doctor2, patient: patient3, status: 'PAID', offsetDays: 0 },
    { doctor: doctor2, patient: patient4, status: 'PAID', offsetDays: 0 },
    { doctor: doctor3, patient: patient5, status: 'VOIDED', offsetDays: 0 },
    { doctor: doctor3, patient: patient6, status: 'VOIDED', offsetDays: 0 },
    { doctor: doctor4, patient: patient7, status: 'PAID', offsetDays: -3 },
    { doctor: doctor4, patient: patient8, status: 'PAID', offsetDays: -5 },
    { doctor: doctor1, patient: patient9, status: 'PAID', offsetDays: -10 },
    { doctor: doctor2, patient: patient10, status: 'PAID', offsetDays: -15 },
  ];

  for (let index = 0; index < flow.length; index++) {
    const item = flow[index];
    if (!item) {
      continue;
    }
    const doctor = item.doctor;
    const patient = item.patient;
    const date = addDays(today, item.offsetDays);

    const consultation = await prisma.consultation.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        patientId: patient.id,
        doctorId: doctor.id,
        date,
        status: item.status,
      },
    });

    const specialty = await prisma.doctorSpecialty.findFirstOrThrow({
      where: { doctorId: doctor.id },
      include: { specialty: true },
    });
    const servicePrice = await prisma.servicePrice.findFirstOrThrow({
      where: { specialtyId: specialty.specialtyId, isActive: true },
      include: { service: true, specialty: true },
    });

    await prisma.consultationService.create({
      data: {
        consultationId: consultation.id,
        serviceId: servicePrice.serviceId,
        specialtyId: servicePrice.specialtyId,
        serviceName: servicePrice.service.name,
        specialtyName: servicePrice.specialty.name,
        priceUsd: servicePrice.priceUsd,
      },
    });

    if (item.status === 'PAID') {
      const total = Number(servicePrice.priceUsd);
      const doctorShare = round(total * Number(doctor.splitPercentage) / 100);
      const centerShare = round(total - doctorShare);

      const idempotencyKey = `demo-${index}-${now.getTime()}`;
      const payment = await prisma.payment.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          idempotencyKey,
          totalServiceUsd: total,
          bcvExchangeRate: 36.5,
          totalPaidUsd: total,
          totalPaidBs: total * 36.5,
          totalIgtfUsd: 0,
          doctorShareUsd: doctorShare,
          centerShareUsd: centerShare,
          status: 'COMPLETED',
          consultation: { connect: { id: consultation.id } },
          details: {
            create: {
              paymentMethod: 'CASH_USD',
              currency: 'USD',
              amount: total,
              appliedIgtfAmount: 0,
            },
          },
        },
        include: { details: true },
      });

      await prisma.paymentItem.create({
        data: {
          paymentId: payment.id,
          itemType: 'CONSULTATION',
          description: `Consulta demo - ${servicePrice.service.name}`,
          quantity: 1,
          unitPriceUsd: total,
          totalPriceUsd: total,
          consultationId: consultation.id,
        },
      });

      await prisma.consultationPayment.create({
        data: {
          idempotencyKey: `demo-${index}-${now.getTime()}`,
          status: 'COMPLETED',
          consultationId: consultation.id,
          paymentId: payment.id,
        },
      });

      await prisma.doctorReceipt.upsert({
        where: { paymentId: payment.id },
        update: {},
        create: {
          receiptNumber: `CM-${DEMO_TENANT_ID}-${index + 1}`,
          paymentId: payment.id,
          generatedById: users.reception.id,
          doctorName: doctor.name,
          doctorDocument: `${doctor.documentType}-${doctor.documentId}`,
          doctorPhone: null,
          bankName: 'Banco Demo',
          accountNumber: '00000000000000000000',
          splitPercentage: doctor.splitPercentage,
          totalConsultation: total,
          doctorShare,
          centerShare,
        },
      });
    } else {
      await prisma.consultationPayment.create({
        data: {
          idempotencyKey: `demo-cancel-${index}-${now.getTime()}`,
          status: 'VOIDED',
          consultationId: consultation.id,
        },
      });
    }

    consultations.push(consultation);
  }

  return consultations;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
