import { randomUUID } from 'node:crypto';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { RequestContextService } from './common/context';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { withPlatformAuditContext } from './platform/audit/platform-audit-context';

import type { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(cookieParser());
  const requestContext = app.get(RequestContextService);
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers['x-correlation-id'];
    const correlationId = (
      typeof header === 'string' ? header : randomUUID()
    ).slice(0, 128);
    const runRequest = () =>
      requestContext.run(
        {
          correlationId,
          requestId: correlationId,
          method: req.method,
          route: req.path,
          ip: req.ip,
          userAgent: req.get('user-agent')?.slice(0, 256),
        },
        next,
      );
    if (req.path === '/platform' || req.path.startsWith('/platform/')) {
      withPlatformAuditContext('HTTP', runRequest);
      return;
    }
    runRequest();
  });

  app.enableCors({
    origin: [
      process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
      /^https:\/\/.*\.goratechlabs\.com$/, // Wildcard: Acepta cualquier subdominio en producción
    ],
    credentials: true,
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3001;

  await app.listen(port);
}

void bootstrap();
