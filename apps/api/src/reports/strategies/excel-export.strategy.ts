import { Injectable } from '@nestjs/common';

import type { ExportStrategy, FlatRow, ReportMetadata } from '../interfaces/export-strategy.interface';

@Injectable()
export class ExcelExportStrategy implements ExportStrategy {
  generate(data: FlatRow[], metadata: ReportMetadata): Promise<Buffer> {
    // Placeholder: returns JSON representation
    // Full implementation will use xlsx library to generate actual .xlsx files
    const content = JSON.stringify({ metadata, rowCount: data.length, preview: data.slice(0, 3) });
    return Promise.resolve(Buffer.from(content, 'utf-8'));
  }
}
