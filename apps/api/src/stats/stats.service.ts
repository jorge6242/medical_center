import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

import type { HomeStatsAlertDto, HomeStatsDto } from './dto/home-stats.dto';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getHomeStats(tenantId: string): Promise<HomeStatsDto> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowStart = addDays(todayStart, 1);
    const monthStart = startOfMonth(now);

    const [todayConsultations, cancelledConsultations, pendingPayments] = await Promise.all([
      this.prisma.consultation.findMany({
        where: { tenantId, status: 'PAID', date: { gte: todayStart, lt: tomorrowStart } },
        select: { patientId: true, doctorId: true },
      }),
      this.prisma.consultation.findMany({
        where: { tenantId, status: 'VOIDED', updatedAt: { gte: monthStart } },
        select: { doctorId: true },
      }),
      this.prisma.payment.findMany({
        where: { status: 'COMPLETED', createdAt: { gte: monthStart }, consultation: { tenantId } },
        select: { doctorShareUsd: true, consultation: { select: { doctorId: true } } },
      }),
    ]);

    const patientIds = new Set(todayConsultations.map((consultation) => consultation.patientId));
    const doctorIdsToday = new Set(todayConsultations.map((consultation) => consultation.doctorId));
    const cancelledDoctorIds = new Set(cancelledConsultations.map((consultation) => consultation.doctorId));

    const pendingPayoutDoctorIds = new Set(
      pendingPayments.map((payment) => payment.consultation?.doctorId).filter((doctorId): doctorId is string => Boolean(doctorId)),
    );
    const pendingPayoutAmountUsd = pendingPayments.reduce(
      (sum, payment) => sum + Number(payment.doctorShareUsd),
      0,
    );

    return {
      patientsToday: patientIds.size,
      doctorsToday: doctorIdsToday.size,
      canceledDoctorsThisMonth: cancelledDoctorIds.size,
      pendingPayoutDoctors: pendingPayoutDoctorIds.size,
      pendingPayoutAmountUsd: pendingPayoutAmountUsd.toFixed(2),
      alerts: buildAlerts(
        patientIds.size,
        doctorIdsToday.size,
        cancelledDoctorIds.size,
        pendingPayoutDoctorIds.size,
        pendingPayoutAmountUsd,
      ),
    };
  }
}

function buildAlerts(
  patientsToday: number,
  doctorsToday: number,
  canceledDoctorsThisMonth: number,
  pendingPayoutDoctors: number,
  pendingPayoutAmountUsd: number,
): HomeStatsAlertDto[] {
  const alerts: HomeStatsAlertDto[] = [];

  if (patientsToday > 0) {
    alerts.push({
      severity: 'info',
      title: 'Actividad de hoy',
      message: `${patientsToday} paciente(s) atendido(s) y ${doctorsToday} doctor(es) con consultas culminadas hoy.`,
    });
  }

  if (canceledDoctorsThisMonth > 0) {
    alerts.push({
      severity: 'warning',
      title: 'Cancelaciones del mes',
      message: `${canceledDoctorsThisMonth} doctor(es) con consultas canceladas este mes.`,
    });
  }

  if (pendingPayoutDoctors > 0) {
    alerts.push({
      severity: 'warning',
      title: 'Pendientes por pagar',
      message: `${pendingPayoutDoctors} doctor(es) y $${pendingPayoutAmountUsd.toFixed(2)} pendientes por liquidar.`,
    });
  }

  return alerts;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
