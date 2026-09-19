export interface FlatRow {
  [key: string]: string | number | undefined;
}

export interface ReportMetadata {
  title: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  tenantName: string;
}

export interface ExportStrategy {
  generate(data: FlatRow[], metadata: ReportMetadata): Promise<Buffer>;
}
