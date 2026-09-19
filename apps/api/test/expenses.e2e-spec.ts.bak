import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';

import { AclGuard } from '../src/auth/guards/acl.guard';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { ExpensesController } from '../src/expenses/expenses.controller';
import { ExpensesService } from '../src/expenses/expenses.service';
import type { JwtPayload } from '../src/common/decorators/current-user.decorator';

describe('ExpensesController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [
        {
          provide: ExpensesService,
          useValue: {
            findAll: jest.fn().mockResolvedValue({
              data: [
                {
                  id: '1',
                  categoryId: 'cat-1',
                  categoryName: 'Servicios',
                  description: 'Pago mensual de internet',
                  amountUsd: '25.00',
                  amountBs: null,
                  status: 'ACTIVE',
                  voidedBy: null,
                  voidReason: null,
                  createdAt: new Date('2026-01-01T00:00:00.000Z'),
                },
              ],
              meta: {
                total: 1,
                page: 1,
                limit: 10,
                totalPages: 1,
                hasNextPage: false,
                hasPreviousPage: false,
              },
            }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AclGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.use((req: Request & { user?: JwtPayload }, _res: Response, next: NextFunction) => {
      req.user = {
        sub: 'user-1',
        tenantId: 'tenant-1',
        email: 'admin@example.com',
        role: 'ADMIN',
        permissions: [{ resource: 'expenses', action: 'read' }],
        roleVersion: 1,
      };
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /expenses returns paginated data and meta', async () => {
    const res = await request(app.getHttpServer()).get('/expenses?page=1&limit=10&search=internet').expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toMatchObject({
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
