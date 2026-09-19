import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('PatientsController (e2e)', () => {
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

  it('GET /patients?page=2&limit=5&search=maria should return correct meta', async () => {
    const res = await request(app.getHttpServer())
      .get('/patients?page=2&limit=5&search=maria')
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('page', 2);
    expect(res.body.meta).toHaveProperty('limit', 5);
    expect(res.body.meta).toHaveProperty('totalPages');
    expect(res.body.meta).toHaveProperty('hasNextPage');
    expect(res.body.meta).toHaveProperty('hasPreviousPage', true);
  });

  it('GET /patients without query params should default to page=1, limit=10', async () => {
    const res = await request(app.getHttpServer())
      .get('/patients')
      .expect(200);

    expect(res.body.meta).toHaveProperty('page', 1);
    expect(res.body.meta).toHaveProperty('limit', 10);
  });
});
