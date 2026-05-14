import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { SacsVerificationService } from './sacs-verification.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SacsVerificationCron {
  private readonly logger = new Logger(SacsVerificationCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sacsVerification: SacsVerificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async retryPendingVerifications(): Promise<void> {
    this.logger.log('Starting daily SACS re-verification for pending doctors');

    const doctors = await this.prisma.doctor.findMany({
      where: {
        isActive: true,
        verificationStatus: { in: ['PENDING', 'NOT_FOUND'] },
        documentId: { not: '' },
      },
      select: { id: true, name: true },
    });

    if (doctors.length === 0) {
      this.logger.log('No doctors pending verification');
      return;
    }

    this.logger.log(`Found ${doctors.length} doctors to re-verify`);

    for (const doctor of doctors) {
      try {
        await this.sacsVerification.verifyDoctor(doctor.id);
        await this.sacsVerification.randomDelay();
      } catch (error) {
        this.logger.error(`Failed to re-verify doctor ${doctor.name} (${doctor.id}): ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    this.logger.log('Daily SACS re-verification complete');
  }
}
