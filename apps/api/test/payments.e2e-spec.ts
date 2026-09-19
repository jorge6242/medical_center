import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /payments?page=1&limit=10&search=maria should return correct meta and data shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/payments?page=1&limit=10&search=maria')
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('page', 1);
    expect(res.body.meta).toHaveProperty('limit', 10);
    expect(res.body.meta).toHaveProperty('totalPages');
    expect(res.body.meta).toHaveProperty('hasNextPage');
    expect(res.body.meta).toHaveProperty('hasPreviousPage', false);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /payments without query params should default to page=1, limit=10', async () => {
    const res = await request(app.getHttpServer())
      .get('/payments')
      .expect(200);

    expect(res.body.meta).toHaveProperty('page', 1);
    expect(res.body.meta).toHaveProperty('limit', 10);
  });

  it('GET /payments with status filter should return only matching payments', async () => {
    const res = await request(app.getHttpServer())
      .get('/payments?status=COMPLETED')
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
