import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';

interface ReportsExportJobData {
  tenantId: string;
  userId: string;
  from: string;
  to: string;
  type: string;
  format: 'pdf' | 'excel';
  groupBy?: string;
}

@Injectable()
@Processor('reports-export')
export class ReportsExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsExportProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<ReportsExportJobData>): Promise<void> {
    const { tenantId, from, to, type, format, groupBy } = job.data;

    this.logger.log(`Processing report job ${job.id}: ${format} for ${type}`);

    try {
      // Update status to processing
      await this.updateJobStatus(job.id!, 'processing');

      // Get data from API or query directly
      // For MVP, we'll generate a simple placeholder file
      const reportData = {
        tenantId,
        from,
        to,
        type,
        format,
        groupBy,
        generatedAt: new Date().toISOString(),
      };

      const content = JSON.stringify(reportData, null, 2);
      const blob = Buffer.from(content, 'utf-8');
      const filename = `reporte-${type}-${from}-al-${to}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      const mimeType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      // Save to database
      await this.prisma.generatedReport.upsert({
        where: { jobId: job.id! },
        update: {
          status: 'completed',
          blob,
          sizeBytes: blob.length,
          filename,
          mimeType,
        },
        create: {
          jobId: job.id!,
          tenantId,
          format,
          filename,
          mimeType,
          blob,
          sizeBytes: blob.length,
          status: 'completed',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h TTL
        },
      });

      this.logger.log(`Report job ${job.id} completed: ${filename}`);
    } catch (error) {
      this.logger.error(`Report job ${job.id} failed: ${error}`);
      
      await this.prisma.generatedReport.upsert({
        where: { jobId: job.id! },
        update: {
          status: 'failed',
          error: (error as Error).message,
        },
        create: {
          jobId: job.id!,
          tenantId,
          format,
          filename: 'failed',
          mimeType: 'application/octet-stream',
          blob: Buffer.from(''),
          sizeBytes: 0,
          status: 'failed',
          error: (error as Error).message,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      throw error;
    }
  }

  private async updateJobStatus(jobId: string, status: string): Promise<void> {
    await this.prisma.generatedReport.updateMany({
      where: { jobId },
      data: { status },
    });
  }
}
