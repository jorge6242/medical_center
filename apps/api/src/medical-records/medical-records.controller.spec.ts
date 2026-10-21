import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';
import { AclGuard } from '../auth/guards/acl.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('MedicalRecordsController query validation', () => {
  let app: INestApplication;
  const findPaidConsultations = jest.fn().mockResolvedValue({ data: [] });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MedicalRecordsController],
      providers: [
        {
          provide: MedicalRecordsService,
          useValue: { findPaidConsultations },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AclGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it('accepts the frontend date query and transforms pagination', async () => {
    await request(app.getHttpServer())
      .get('/medical-records/paid-consultations')
      .query({ page: '1', limit: '10', date: '2026-10-19' })
      .expect(200);

    expect(findPaidConsultations).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ page: 1, limit: 10, date: '2026-10-19' }),
    );
  });

  it.each([
    { date: '2026-02-30' },
    { date: '2026-10-19', unknownFilter: 'unexpected' },
  ])('rejects invalid or unsupported query parameters: %j', async (query) => {
    await request(app.getHttpServer())
      .get('/medical-records/paid-consultations')
      .query(query)
      .expect(400);

    expect(findPaidConsultations).not.toHaveBeenCalled();
  });
});
