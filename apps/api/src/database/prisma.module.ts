import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RequestContextModule } from '../common/context';

@Global()
@Module({
  imports: [AuditLogModule, RequestContextModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
