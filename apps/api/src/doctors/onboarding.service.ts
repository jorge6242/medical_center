import { BadRequestException, GoneException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../database/prisma.service';
import { MailerService } from '../mailer/mailer.service';

import type { OnboardingTokenStatus } from '@prisma/client';

interface OnboardingJwtPayload {
  sub: string;
  purpose: 'onboarding';
  doctorId: string;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  private readonly ONBOARDING_EXPIRES_HOURS = 24;
  private readonly RATE_LIMIT_COUNT = 3;
  private readonly RATE_LIMIT_WINDOW_HOURS = 1;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  async sendOnboarding(
    tenantId: string,
    doctorId: string,
    adminUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ tokenId: string; sentAt: Date }> {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, tenantId, isActive: true },
    });
    if (!doctor) {
      throw new NotFoundException(`Doctor ${doctorId} no encontrado`);
    }

    // Find or create user
    let user = doctor.userId
      ? await this.prisma.user.findUnique({ where: { id: doctor.userId } })
      : null;

    if (!user) {
      const doctorRole = await this.prisma.role.findFirst({
        where: { tenantId, name: 'doctor', isActive: true },
      });
      if (!doctorRole) {
        throw new NotFoundException('Rol doctor no encontrado para este tenant');
      }

      const passwordHash = await bcrypt.hash(this.generateTempPassword(), 10);
      user = await this.prisma.user.create({
        data: {
          tenantId,
          email: doctor.email ?? `doctor-${doctor.documentId}@centromedico.local`,
          passwordHash,
          name: doctor.name,
          roleId: doctorRole.id,
        },
      });

      await this.prisma.doctor.update({
        where: { id: doctorId },
        data: { userId: user.id },
      });

      this.logger.log(`Created user ${user.id} for doctor ${doctorId}`);
    }

    // Rate limit check
    const recentTokens = await this.prisma.onboardingToken.count({
      where: {
        userId: user.id,
        sentAt: {
          gte: new Date(Date.now() - this.RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000),
        },
      },
    });

    if (recentTokens >= this.RATE_LIMIT_COUNT) {
      throw new HttpException(
        `Límite de ${this.RATE_LIMIT_COUNT} invitaciones por hora alcanzado. Intenta más tarde.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Expire previous pending tokens
    await this.prisma.onboardingToken.updateMany({
      where: { userId: user.id, status: 'PENDING' as OnboardingTokenStatus },
      data: { status: 'EXPIRED' as OnboardingTokenStatus },
    });

    // Generate token
    const payload: OnboardingJwtPayload = {
      sub: user.id,
      purpose: 'onboarding',
      doctorId,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: `${this.ONBOARDING_EXPIRES_HOURS}h`,
    });

    const expiresAt = new Date(Date.now() + this.ONBOARDING_EXPIRES_HOURS * 60 * 60 * 1000);

    const onboardingToken = await this.prisma.onboardingToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // Send email (fire-and-forget)
    this.sendOnboardingEmail(doctor.name, doctor.email ?? user.email, token).catch((error: unknown) => {
      this.logger.error(
        `Failed to send onboarding email to ${doctor.email}: ${error instanceof Error ? error.message : String(error)}`,
      );
    });

    return { tokenId: onboardingToken.id, sentAt: onboardingToken.sentAt };
  }

  async validateToken(token: string): Promise<{ userId: string; doctorId: string }> {
    // Verify JWT
    let payload: OnboardingJwtPayload;
    try {
      payload = this.jwtService.verify<OnboardingJwtPayload>(token);
    } catch {
      throw new GoneException('El enlace de activación ha expirado o es inválido');
    }

    if (payload.purpose !== 'onboarding') {
      throw new BadRequestException('Token inválido');
    }

    // Check database record
    const record = await this.prisma.onboardingToken.findUnique({
      where: { token },
    });

    if (!record) {
      throw new GoneException('El enlace de activación ya no es válido');
    }

    if (record.status === 'COMPLETED') {
      throw new GoneException('Esta invitación ya fue utilizada');
    }

    if (record.status === 'EXPIRED' || new Date() > record.expiresAt) {
      throw new GoneException('El enlace de activación ha expirado');
    }

    return { userId: payload.sub, doctorId: payload.doctorId };
  }

  async completeOnboarding(token: string, password: string): Promise<void> {
    const { userId } = await this.validateToken(token);

    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, isActive: true },
      }),
      this.prisma.onboardingToken.update({
        where: { token },
        data: { status: 'COMPLETED' as OnboardingTokenStatus, completedAt: new Date() },
      }),
    ]);

    this.logger.log(`Onboarding completed for user ${userId}`);
  }

  async getOnboardingStatus(
    tenantId: string,
    doctorId: string,
  ): Promise<{ status: string; sentAt: Date | null; expiresAt: Date | null }> {
    const doctor = await this.prisma.doctor.findFirst({
      where: { id: doctorId, tenantId },
      select: { userId: true },
    });

    if (!doctor?.userId) {
      return { status: 'NO_USER', sentAt: null, expiresAt: null };
    }

    const latestToken = await this.prisma.onboardingToken.findFirst({
      where: { userId: doctor.userId },
      orderBy: { sentAt: 'desc' },
    });

    if (!latestToken) {
      return { status: 'NO_TOKEN', sentAt: null, expiresAt: null };
    }

    return {
      status: latestToken.status,
      sentAt: latestToken.sentAt,
      expiresAt: latestToken.expiresAt,
    };
  }

  private async sendOnboardingEmail(doctorName: string, to: string, token: string): Promise<void> {
    const onboardingUrl = `${this.getFrontendUrl()}/onboarding?token=${encodeURIComponent(token)}`;

    const { subject, html } = this.mailerService.renderTemplate('onboardingEmail', {
      doctorName,
      onboardingUrl,
      expiresIn: '24 horas',
    });

    await this.mailerService.sendReceiptEmail(to, subject, html);
  }

  private getFrontendUrl(): string {
    // In production, this should come from config
    return process.env['FRONTEND_URL'] ?? 'http://localhost:3000';
  }

  private generateTempPassword(): string {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }
}
