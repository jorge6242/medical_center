import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppConfigModule } from './app-config/app-config.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { envValidationSchema } from './config/env.validation';
import { jwtConfig } from './config/jwt.config';
import { mailerConfig } from './config/mailer.config';
import { PrismaModule } from './database/prisma.module';
import { DoctorsModule } from './doctors/doctors.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { ExpensesModule } from './expenses/expenses.module';
import { HealthController } from './health.controller';
import { LabOrdersModule } from './lab-orders/lab-orders.module';
import { LabsModule } from './labs/labs.module';
import { MailerModule } from './mailer/mailer.module';
import { PatientsModule } from './patients/patients.module';
import { PaymentsModule } from './payments/payments.module';
import { QueuesModule } from './queues/queues.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { RolesModule } from './roles/roles.module';
import { SpecialtiesModule } from './specialties/specialties.module';
import { StatsModule } from './stats/stats.module';

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
    PrismaModule,
    QueuesModule,
    RolesModule,
    AuthModule,
    PatientsModule,
    SpecialtiesModule,
    DoctorsModule,
    PaymentsModule,
    ExpensesModule,
    ExchangeRatesModule,
    AppConfigModule,
    MailerModule,
    ReceiptsModule,
    StatsModule,
    AuditLogModule,
    LabsModule,
    LabOrdersModule,
    CatalogModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
