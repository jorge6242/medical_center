import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppConfigModule } from './app-config/app-config.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { RequestContextModule } from './common/context';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { envValidationSchema } from './config/env.validation';
import { jwtConfig } from './config/jwt.config';
import { mailerConfig } from './config/mailer.config';
import { ConsultationsModule } from './consultations/consultations.module';
import { PrismaModule } from './database/prisma.module';
import { DoctorPayoutsModule } from './doctor-payouts/doctor-payouts.module';
import { DoctorsModule } from './doctors/doctors.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { ExpensesModule } from './expenses/expenses.module';
import { HealthController } from './health.controller';
import { LabOrdersModule } from './lab-orders/lab-orders.module';
import { LabsModule } from './labs/labs.module';
import { MailerModule } from './mailer/mailer.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PatientsModule } from './patients/patients.module';
import { PaymentsModule } from './payments/payments.module';
import { PlatformAuditModule } from './platform/audit/platform-audit.module';
import { PlatformAuthModule } from './platform/auth/platform-auth.module';
import { PlatformDashboardModule } from './platform/dashboard/platform-dashboard.module';
import { PlatformSubscriptionsModule } from './platform/subscriptions/platform-subscriptions.module';
import { PlatformTenantsModule } from './platform/tenants/platform-tenants.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { RemindersModule } from './reminders/reminders.module';
import { ReportsModule } from './reports/reports.module';
import { RolesModule } from './roles/roles.module';
import { SpecialtiesModule } from './specialties/specialties.module';
import { StatsModule } from './stats/stats.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env['NODE_ENV']}`, '.env'],
      load: [appConfig, databaseConfig, jwtConfig, mailerConfig],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true, allowUnknown: true },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    RolesModule,
    RequestContextModule,
    AuthModule,
    PlatformAuthModule,
    PlatformTenantsModule,
    PlatformSubscriptionsModule,
    PlatformAuditModule,
    PlatformDashboardModule,
    PatientsModule,
    SpecialtiesModule,
    DoctorsModule,
    DoctorPayoutsModule,
    ConsultationsModule,
    PaymentsModule,
    ExpensesModule,
    ExchangeRatesModule,
    AppConfigModule,
    MailerModule,
    NotificationsModule,
    MedicalRecordsModule,
    RemindersModule,
    ReceiptsModule,
    StatsModule,
    AuditLogModule,
    LabsModule,
    LabOrdersModule,
    CatalogModule,
    ReportsModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
