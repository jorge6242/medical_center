import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import {
  NotificationChannel,
  NotificationType,
} from '../notifications/notification.types';
import { NotificationService } from '../notifications/notifications.service';
import { RailwayBucketService } from '../railway-bucket/railway-bucket.service';

import type { ReminderConfig, ReminderType } from '@prisma/client';

interface ReminderContext {
  centerName: string;
  logoUrl: string;
}

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly railwayBucket: RailwayBucketService,
  ) {}

  async sendAppointmentReminders(): Promise<void> {
    this.logger.log('Starting daily appointment reminders');

    const tomorrow = this.tomorrowInCaracas();
    const startOfTomorrow = this.startOfDayInCaracas(tomorrow);
    const endOfTomorrow = this.endOfDayInCaracas(tomorrow);

    const configs = await this.prisma.reminderConfig.findMany({
      where: { type: 'APPOINTMENT', isActive: true },
    });

    for (const config of configs) {
      await this.processAppointmentRemindersForTenant(
        config,
        startOfTomorrow,
        endOfTomorrow,
      );
    }

    this.logger.log('Daily appointment reminders complete');
  }

  async sendBirthdayReminders(): Promise<void> {
    this.logger.log('Starting daily birthday reminders');

    const configs = await this.prisma.reminderConfig.findMany({
      where: { type: 'BIRTHDAY', isActive: true },
    });

    for (const config of configs) {
      await this.processBirthdayRemindersForTenant(config);
    }

    this.logger.log('Daily birthday reminders complete');
  }

  private async processAppointmentRemindersForTenant(
    config: ReminderConfig,
    startOfTomorrow: Date,
    endOfTomorrow: Date,
  ): Promise<void> {
    const consultations = await this.prisma.consultation.findMany({
      where: {
        tenantId: config.tenantId,
        status: 'SCHEDULED',
        date: { gte: startOfTomorrow, lte: endOfTomorrow },
      },
      include: {
        patient: {
          select: { id: true, name: true, email: true },
        },
        doctor: {
          select: { id: true, name: true, email: true },
        },
        services: {
          select: { serviceName: true },
        },
        tenant: {
          select: {
            name: true,
            logoObjectKey: true,
            logoUrl: true,
            email: true,
          },
        },
      },
    });

    const firstConsultation = consultations[0];
    if (!firstConsultation) {
      return;
    }

    const reminderContext = await this.buildReminderContext(
      config.tenantId,
      firstConsultation.tenant.name,
      firstConsultation.tenant.logoObjectKey,
      firstConsultation.tenant.logoUrl,
    );

    for (const consultation of consultations) {
      try {
        await this.sendAppointmentReminder(
          config,
          consultation,
          reminderContext,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send appointment reminder for consultation ${consultation.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async sendAppointmentReminder(
    config: ReminderConfig,
    consultation: {
      id: string;
      tenantId: string;
      date: Date;
      patient: { id: string; name: string; email: string | null };
      doctor: { id: string; name: string; email: string | null };
      services: { serviceName: string }[];
    },
    reminderContext: ReminderContext,
  ): Promise<void> {
    const scheduledDate = consultation.date.toLocaleDateString('es-VE', {
      timeZone: 'America/Caracas',
    });
    const scheduledTime = consultation.date.toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Caracas',
    });
    const services = consultation.services.map((s) => s.serviceName).join(', ');

    const baseContext = {
      ...reminderContext,
      patientName: consultation.patient.name,
      doctorName: consultation.doctor.name,
      scheduledDate,
      scheduledTime,
      services,
    };

    if (config.sendToPatient && consultation.patient.email) {
      await this.trySendNotification(
        'APPOINTMENT',
        consultation.tenantId,
        consultation.patient.email,
        NotificationType.APPOINTMENT_REMINDER_PATIENT,
        baseContext,
        consultation.id,
        consultation.patient.id,
        `APPOINTMENT:${consultation.id}:${NotificationType.APPOINTMENT_REMINDER_PATIENT}`,
      );
    }

    if (config.sendToDoctor && consultation.doctor.email) {
      await this.trySendNotification(
        'APPOINTMENT',
        consultation.tenantId,
        consultation.doctor.email,
        NotificationType.APPOINTMENT_REMINDER_DOCTOR,
        baseContext,
        consultation.id,
        consultation.patient.id,
        `APPOINTMENT:${consultation.id}:${NotificationType.APPOINTMENT_REMINDER_DOCTOR}`,
      );
    }
  }

  private async processBirthdayRemindersForTenant(
    config: ReminderConfig,
  ): Promise<void> {
    const today = new Date();
    const month = today.getUTCMonth() + 1;
    const day = today.getUTCDate();

    const patients = await this.prisma.patient.findMany({
      where: {
        tenantId: config.tenantId,
        isActive: true,
        birthDate: { not: null },
      },
      include: {
        tenant: {
          select: {
            name: true,
            logoObjectKey: true,
            logoUrl: true,
            email: true,
          },
        },
      },
    });

    const birthdayPatients = patients.filter((patient) => {
      if (!patient.birthDate) return false;
      const birthMonth = patient.birthDate.getUTCMonth() + 1;
      const birthDay = patient.birthDate.getUTCDate();
      return birthMonth === month && birthDay === day;
    });

    const firstPatient = birthdayPatients[0];
    if (!firstPatient) {
      return;
    }

    const reminderContext = await this.buildReminderContext(
      config.tenantId,
      firstPatient.tenant.name,
      firstPatient.tenant.logoObjectKey,
      firstPatient.tenant.logoUrl,
    );

    for (const patient of birthdayPatients) {
      try {
        await this.sendBirthdayReminder(config, patient, reminderContext);
      } catch (error) {
        this.logger.error(
          `Failed to send birthday reminder for patient ${patient.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async sendBirthdayReminder(
    config: ReminderConfig,
    patient: {
      id: string;
      tenantId: string;
      name: string;
      email: string | null;
      tenant: { email: string | null };
    },
    reminderContext: ReminderContext,
  ): Promise<void> {
    const birthdayYear = this.yearInCaracas();

    if (config.sendToPatient && patient.email) {
      await this.trySendNotification(
        'BIRTHDAY',
        patient.tenantId,
        patient.email,
        NotificationType.BIRTHDAY_PATIENT,
        {
          ...reminderContext,
          patientName: patient.name,
        },
        undefined,
        patient.id,
        `BIRTHDAY:${birthdayYear}:${patient.id}:${NotificationType.BIRTHDAY_PATIENT}`,
      );
    }

    if (config.sendToAdmin && patient.tenant.email) {
      await this.trySendNotification(
        'BIRTHDAY',
        patient.tenantId,
        patient.tenant.email,
        NotificationType.BIRTHDAY_ADMIN_NOTIFICATION,
        {
          ...reminderContext,
          adminName: 'Administrador',
          patientName: patient.name,
          patientEmail: patient.email ?? 'No disponible',
        },
        undefined,
        patient.id,
        `BIRTHDAY:${birthdayYear}:${patient.id}:${NotificationType.BIRTHDAY_ADMIN_NOTIFICATION}`,
      );
    }
  }

  private async trySendNotification(
    type: ReminderType,
    tenantId: string,
    recipientEmail: string,
    notificationType: NotificationType,
    context: Record<string, unknown>,
    consultationId: string | undefined,
    patientId: string,
    deduplicationKey: string,
  ): Promise<void> {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await this.sendNotification(
          type,
          tenantId,
          recipientEmail,
          notificationType,
          context,
          consultationId,
          patientId,
          deduplicationKey,
        );
        return;
      } catch (error) {
        if (attempt === 2) {
          this.logger.error(
            `Failed to send ${notificationType} to ${recipientEmail}: ${this.errorMessage(error)}`,
          );
        }
      }
    }
  }

  private async sendNotification(
    type: ReminderType,
    tenantId: string,
    recipientEmail: string,
    notificationType: NotificationType,
    context: Record<string, unknown>,
    consultationId: string | undefined,
    patientId: string,
    deduplicationKey: string,
  ): Promise<void> {
    const claimed = await this.claimReminder({
      deduplicationKey,
      tenantId,
      type,
      consultationId,
      patientId,
      recipientEmail,
      notificationType,
    });
    if (!claimed) return;

    try {
      await this.notificationService.send(
        notificationType,
        tenantId,
        recipientEmail,
        context,
        NotificationChannel.EMAIL,
      );
      await this.updateReminderStatus(deduplicationKey, 'sent');
    } catch (error) {
      await this.updateReminderStatus(
        deduplicationKey,
        'failed',
        this.errorMessage(error),
      );
      throw error;
    }
  }

  private async claimReminder(data: {
    deduplicationKey: string;
    tenantId: string;
    type: ReminderType;
    consultationId: string | undefined;
    patientId: string;
    recipientEmail: string;
    notificationType: NotificationType;
  }): Promise<boolean> {
    try {
      await this.prisma.reminderLog.create({
        data: {
          deduplicationKey: data.deduplicationKey,
          tenantId: data.tenantId,
          type: data.type,
          channel: NotificationChannel.EMAIL,
          consultationId: data.consultationId,
          patientId: data.patientId,
          recipient: data.recipientEmail,
          notificationType: data.notificationType,
          status: 'pending',
        },
      });
      return true;
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) throw error;
    }

    const retry = await this.prisma.reminderLog.updateMany({
      where: { deduplicationKey: data.deduplicationKey, status: 'failed' },
      data: { status: 'pending', error: null, sentAt: new Date() },
    });
    return retry.count === 1;
  }

  private updateReminderStatus(
    deduplicationKey: string,
    status: 'sent' | 'failed',
    error: string | null = null,
  ): Promise<unknown> {
    return this.prisma.reminderLog.update({
      where: { deduplicationKey },
      data: { status, error, sentAt: new Date() },
    });
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private async buildReminderContext(
    tenantId: string,
    tenantName: string,
    logoObjectKey: string | null,
    logoUrl: string | null,
  ): Promise<ReminderContext> {
    const resolvedLogoUrl = await this.railwayBucket.resolveLogoUrl(
      logoObjectKey,
      logoUrl,
    );

    return {
      centerName: tenantName,
      logoUrl: resolvedLogoUrl ?? '',
    };
  }

  private tomorrowInCaracas(): Date {
    const now = new Date();
    const caracasDateString = now.toLocaleDateString('en-CA', {
      timeZone: 'America/Caracas',
    });
    const caracasNow = new Date(`${caracasDateString}T00:00:00-04:00`);
    return new Date(caracasNow.getTime() + 24 * 60 * 60 * 1000);
  }

  private startOfDayInCaracas(date: Date): Date {
    const caracasDateString = date.toLocaleDateString('en-CA', {
      timeZone: 'America/Caracas',
    });
    return new Date(`${caracasDateString}T00:00:00-04:00`);
  }

  private endOfDayInCaracas(date: Date): Date {
    const caracasDateString = date.toLocaleDateString('en-CA', {
      timeZone: 'America/Caracas',
    });
    return new Date(`${caracasDateString}T23:59:59.999-04:00`);
  }

  private yearInCaracas(): string {
    return new Intl.DateTimeFormat('en', {
      year: 'numeric',
      timeZone: 'America/Caracas',
    }).format(new Date());
  }
}
