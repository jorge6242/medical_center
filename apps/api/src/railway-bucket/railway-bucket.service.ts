import { randomUUID } from 'node:crypto';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RailwayBucketService {
  constructor(private readonly configService: ConfigService) {}

  async resolveLogoUrl(
    logoObjectKey: string | null,
    legacyLogoUrl: string | null,
  ): Promise<string | null> {
    if (!logoObjectKey) return legacyLogoUrl;

    const config = this.getStorageConfig();
    const client = this.createClient(config);

    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: config.bucket, Key: logoObjectKey }),
      { expiresIn: config.signedUrlTtlSeconds },
    );
  }

  async uploadLogo(tenantSlug: string, file: UploadedLogo): Promise<string> {
    const extension = LOGO_EXTENSIONS[file.mimetype];
    if (!extension) {
      throw new BadRequestException('El logo debe ser PNG, JPEG o WebP');
    }
    if (file.size === 0 || file.size > MAX_LOGO_SIZE_BYTES) {
      throw new BadRequestException('El logo no puede superar 2 MB');
    }

    const config = this.getStorageConfig();
    const objectKey = this.createLogoObjectKey(tenantSlug, extension);
    await this.createClient(config).send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return objectKey;
  }

  async deleteObject(objectKey: string): Promise<void> {
    const config = this.getStorageConfig();
    await this.createClient(config).send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey }),
    );
  }

  private createClient(config: StorageConfig): S3Client {
    return new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  private createLogoObjectKey(tenantSlug: string, extension: string): string {
    const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
    return `companies/${tenantSlug}/logos/logo-${timestamp}-${randomUUID()}.${extension}`;
  }

  private getStorageConfig(): StorageConfig {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const bucket = this.configService.get<string>('S3_BUCKET');
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'S3_SECRET_ACCESS_KEY',
    );

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new ServiceUnavailableException(
        'El almacenamiento de logos no está configurado',
      );
    }

    return {
      endpoint,
      bucket,
      accessKeyId,
      secretAccessKey,
      region: this.configService.get<string>('S3_REGION', 'auto'),
      signedUrlTtlSeconds: Number(
        this.configService.get<number | string>(
          'S3_SIGNED_URL_TTL_SECONDS',
          43200,
        ),
      ),
    };
  }
}

interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  signedUrlTtlSeconds: number;
}

export interface UploadedLogo {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const LOGO_EXTENSIONS: Record<string, string | undefined> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};
