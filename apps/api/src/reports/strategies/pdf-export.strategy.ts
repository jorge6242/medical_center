import { Injectable } from '@nestjs/common';

import type {
  ExportStrategy,
  FlatRow,
  ReportMetadata,
} from '../interfaces/export-strategy.interface';

@Injectable()
export class PdfExportStrategy implements ExportStrategy {
  generate(data: FlatRow[], metadata: ReportMetadata): Promise<Buffer> {
    // This is a placeholder that creates a simple text-based PDF structure
    // The actual implementation will use @react-pdf/renderer in the worker
    // For now, we return a buffer with the metadata and row count
    const content = JSON.stringify({
      metadata,
      rowCount: data.length,
      preview: data.slice(0, 3),
    });
    return Promise.resolve(Buffer.from(content, 'utf-8'));
  }
}
