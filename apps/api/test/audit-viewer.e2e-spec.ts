import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AuditLogQueryService } from '../src/audit-log/audit-log-query.service';
import { AuditLogController } from '../src/audit-log/audit-log.controller';

describe('Audit viewer (e2e)', () => {
  let app: INestApplication;
  const list = jest.fn().mockResolvedValue({
    data: [
      { id: 'audit-a', entity: 'Patient', action: 'UPDATE', result: 'SUCCESS' },
    ],
    nextCursor: null,
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [{ provide: AuditLogQueryService, useValue: { list } }],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterAll(async () => app.close());

  it('returns only the redacted viewer DTO contract', async () => {
    const response = await request(app.getHttpServer())
      .get('/audit-logs?entity=Patient')
      .expect(200);
    expect(response.body.data).toEqual([
      { id: 'audit-a', entity: 'Patient', action: 'UPDATE', result: 'SUCCESS' },
    ]);
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'Patient' }),
    );
  });
});
