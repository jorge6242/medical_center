import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
  const prisma = {
    tenant: {
      findFirstOrThrow: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const railwayBucket = {
    uploadLogo: jest.fn(),
    deleteObject: jest.fn(),
    resolveLogoUrl: jest.fn(),
  };

  const service = new AppConfigService(
    prisma as never,
    {} as never,
    railwayBucket as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('replaces the object key and removes the previous logo', async () => {
    prisma.tenant.findFirstOrThrow.mockResolvedValue({
      logoObjectKey: 'tenants/tenant-1/logos/previous.webp',
    });
    railwayBucket.uploadLogo.mockResolvedValue(
      'tenants/tenant-1/logos/new.webp',
    );
    railwayBucket.resolveLogoUrl.mockResolvedValue(
      'https://signed.example/new',
    );

    await expect(
      service.replaceLogo('tenant-1', {
        buffer: Buffer.from('logo'),
        mimetype: 'image/webp',
        size: 4,
      }),
    ).resolves.toEqual({ logoUrl: 'https://signed.example/new' });

    expect(prisma.tenant.updateMany).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: { logoObjectKey: 'tenants/tenant-1/logos/new.webp' },
    });
    expect(railwayBucket.deleteObject).toHaveBeenCalledWith(
      'tenants/tenant-1/logos/previous.webp',
    );
  });

  it('removes the new object if persisting its key fails', async () => {
    prisma.tenant.findFirstOrThrow.mockResolvedValue({ logoObjectKey: null });
    prisma.tenant.updateMany.mockRejectedValue(
      new Error('database unavailable'),
    );
    railwayBucket.uploadLogo.mockResolvedValue(
      'tenants/tenant-1/logos/new.webp',
    );

    await expect(
      service.replaceLogo('tenant-1', {
        buffer: Buffer.from('logo'),
        mimetype: 'image/webp',
        size: 4,
      }),
    ).rejects.toThrow('database unavailable');

    expect(railwayBucket.deleteObject).toHaveBeenCalledWith(
      'tenants/tenant-1/logos/new.webp',
    );
  });
});
