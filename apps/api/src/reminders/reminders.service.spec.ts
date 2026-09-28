import { RemindersService } from './reminders.service';
import { NotificationType } from '../notifications/notification.types';

import type { PrismaService } from '../database/prisma.service';
import type { NotificationService } from '../notifications/notifications.service';
import type { RailwayBucketService } from '../railway-bucket/railway-bucket.service';

describe('RemindersService', () => {
  const prisma = {
    reminderConfig: { findMany: jest.fn() },
    consultation: { findMany: jest.fn() },
    patient: { findMany: jest.fn() },
    reminderLog: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  } as unknown as PrismaService;
  const notificationService = {
    send: jest.fn(),
  } as unknown as NotificationService;
  const railwayBucket = {
    resolveLogoUrl: jest.fn().mockResolvedValue(null),
  } as unknown as RailwayBucketService;
  const service = new RemindersService(
    prisma,
    notificationService,
    railwayBucket,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (notificationService.send as jest.Mock)
      .mockReset()
      .mockResolvedValue(undefined);
    (prisma.reminderLog.create as jest.Mock).mockResolvedValue({
      id: 'reminder-log-1',
    });
    (prisma.reminderLog.update as jest.Mock).mockResolvedValue({});
    (prisma.reminderLog.updateMany as jest.Mock).mockResolvedValue({
      count: 0,
    });
  });

  it('attempts the doctor reminder when the patient delivery fails', async () => {
    mockAppointmentConfig({ sendToPatient: true, sendToDoctor: true });
    mockAppointment();
    (notificationService.send as jest.Mock).mockImplementation(
      (_type: NotificationType, _tenantId: string, recipient: string) => {
        if (recipient === 'patient@example.com') {
          throw new Error('SMTP patient failure');
        }
        return Promise.resolve();
      },
    );

    await service.sendAppointmentReminders();

    expect(notificationService.send).toHaveBeenCalledWith(
      NotificationType.APPOINTMENT_REMINDER_DOCTOR,
      'tenant-1',
      'doctor@example.com',
      expect.any(Object),
      expect.any(String),
    );
  });

  it('does not deliver an appointment reminder already claimed by another worker', async () => {
    mockAppointmentConfig({ sendToPatient: true, sendToDoctor: false });
    mockAppointment();
    (prisma.reminderLog.create as jest.Mock).mockRejectedValue({
      code: 'P2002',
    });

    await service.sendAppointmentReminders();

    expect(notificationService.send).not.toHaveBeenCalled();
  });

  it('retries a transient delivery failure once', async () => {
    mockAppointmentConfig({ sendToPatient: true, sendToDoctor: false });
    mockAppointment();
    (prisma.reminderLog.create as jest.Mock)
      .mockResolvedValueOnce({ id: 'reminder-log-1' })
      .mockRejectedValueOnce({ code: 'P2002' });
    (prisma.reminderLog.updateMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
    (notificationService.send as jest.Mock)
      .mockRejectedValueOnce(new Error('Temporary SMTP failure'))
      .mockResolvedValueOnce(undefined);

    await service.sendAppointmentReminders();

    expect(notificationService.send).toHaveBeenCalledTimes(2);
    expect(prisma.reminderLog.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'sent' }),
      }),
    );
  });

  it('retries a failed appointment reminder claim', async () => {
    mockAppointmentConfig({ sendToPatient: true, sendToDoctor: false });
    mockAppointment();
    (prisma.reminderLog.create as jest.Mock).mockRejectedValue({
      code: 'P2002',
    });
    (prisma.reminderLog.updateMany as jest.Mock).mockResolvedValue({
      count: 1,
    });

    await service.sendAppointmentReminders();

    expect(notificationService.send).toHaveBeenCalledTimes(1);
    expect(prisma.reminderLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'sent' }),
      }),
    );
  });

  it('attempts the admin birthday notification when patient delivery fails', async () => {
    mockBirthdayConfig();
    const today = new Date();
    (prisma.patient.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'patient-1',
        tenantId: 'tenant-1',
        name: 'Ana Pérez',
        email: 'patient@example.com',
        birthDate: new Date(
          Date.UTC(1990, today.getUTCMonth(), today.getUTCDate()),
        ),
        tenant: {
          name: 'Centro Médico',
          email: 'admin@example.com',
          logoObjectKey: null,
          logoUrl: null,
        },
      },
    ]);
    (notificationService.send as jest.Mock).mockImplementation(
      (_type: NotificationType, _tenantId: string, recipient: string) => {
        if (recipient === 'patient@example.com') {
          throw new Error('SMTP patient failure');
        }
        return Promise.resolve();
      },
    );

    await service.sendBirthdayReminders();

    expect(notificationService.send).toHaveBeenCalledWith(
      NotificationType.BIRTHDAY_ADMIN_NOTIFICATION,
      'tenant-1',
      'admin@example.com',
      expect.any(Object),
      expect.any(String),
    );
  });

  function mockAppointmentConfig(overrides: {
    sendToPatient: boolean;
    sendToDoctor: boolean;
  }): void {
    (prisma.reminderConfig.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'config-1',
        tenantId: 'tenant-1',
        type: 'APPOINTMENT',
        isActive: true,
        sendToPatient: overrides.sendToPatient,
        sendToDoctor: overrides.sendToDoctor,
        sendToAdmin: false,
        hoursBefore: 24,
        daysBefore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  }

  function mockBirthdayConfig(): void {
    (prisma.reminderConfig.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'config-1',
        tenantId: 'tenant-1',
        type: 'BIRTHDAY',
        isActive: true,
        sendToPatient: true,
        sendToDoctor: false,
        sendToAdmin: true,
        hoursBefore: null,
        daysBefore: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  }

  function mockAppointment(): void {
    (prisma.consultation.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'consultation-1',
        tenantId: 'tenant-1',
        date: new Date('2026-09-29T14:00:00.000Z'),
        patient: {
          id: 'patient-1',
          name: 'Ana Pérez',
          email: 'patient@example.com',
        },
        doctor: {
          id: 'doctor-1',
          name: 'Dr. José Pérez',
          email: 'doctor@example.com',
        },
        services: [{ serviceName: 'Consulta' }],
        tenant: {
          name: 'Centro Médico',
          email: 'admin@example.com',
          logoObjectKey: null,
          logoUrl: null,
        },
      },
    ]);
  }
});
