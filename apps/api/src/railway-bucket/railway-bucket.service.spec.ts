import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { RailwayBucketService } from './railway-bucket.service';

import type { ConfigService } from '@nestjs/config';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('RailwayBucketService', () => {
  const getSignedUrlMock = jest.mocked(getSignedUrl);

  function createService(values: Record<string, string | undefined> = {}) {
    const configService = {
      get: jest.fn(<T>(key: string, defaultValue?: T): T | undefined => {
        return (values[key] as T | undefined) ?? defaultValue;
      }),
    } as unknown as ConfigService;

    return new RailwayBucketService(configService);
  }

  beforeEach(() => {
    getSignedUrlMock.mockReset();
    jest.restoreAllMocks();
  });

  it('preserves the legacy URL when no object key exists', async () => {
    const service = createService();

    await expect(
      service.resolveLogoUrl(null, 'https://legacy.example/logo.png'),
    ).resolves.toBe('https://legacy.example/logo.png');

    expect(getSignedUrlMock).not.toHaveBeenCalled();
  });

  it('creates a signed URL for the persisted object key', async () => {
    getSignedUrlMock.mockResolvedValue('https://signed.storageapi.dev/logo');
    const service = createService({
      S3_ENDPOINT: 'https://t3.storageapi.dev',
      S3_REGION: 'auto',
      S3_BUCKET: 'centromedicoassets-2vk1-l',
      S3_ACCESS_KEY_ID: 'access-key',
      S3_SECRET_ACCESS_KEY: 'secret-key',
      S3_SIGNED_URL_TTL_SECONDS: '43200',
    });

    await expect(
      service.resolveLogoUrl('tenants/tenant-1/logo.webp', null),
    ).resolves.toBe('https://signed.storageapi.dev/logo');

    expect(getSignedUrlMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: {
          Bucket: 'centromedicoassets-2vk1-l',
          Key: 'tenants/tenant-1/logo.webp',
        },
      }),
      { expiresIn: 43200 },
    );
  });

  it('fails clearly when a logo exists but bucket configuration is incomplete', async () => {
    const service = createService();

    await expect(
      service.resolveLogoUrl('tenants/tenant-1/logo.webp', null),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('uploads a validated logo under its company slug prefix', async () => {
    const sendMock = jest
      .spyOn(S3Client.prototype, 'send')
      .mockResolvedValue({} as never);
    const service = createService({
      S3_ENDPOINT: 'https://t3.storageapi.dev',
      S3_BUCKET: 'centromedicoassets-2vk1-l',
      S3_ACCESS_KEY_ID: 'access-key',
      S3_SECRET_ACCESS_KEY: 'secret-key',
    });

    const objectKey = await service.uploadLogo('centro-medico-demo', {
      buffer: Buffer.from('logo'),
      mimetype: 'image/webp',
      size: 4,
    });

    expect(objectKey).toMatch(
      /^companies\/centro-medico-demo\/logos\/logo-.+-.+\.webp$/,
    );
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: 'centromedicoassets-2vk1-l',
          ContentType: 'image/webp',
        }),
      }),
    );
  });

  it('rejects unsupported logo formats before calling Railway', async () => {
    const service = createService();

    await expect(
      service.uploadLogo('centro-medico-demo', {
        buffer: Buffer.from('logo'),
        mimetype: 'image/svg+xml',
        size: 4,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
