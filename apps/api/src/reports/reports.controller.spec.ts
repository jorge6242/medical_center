
import {
  type ConsolidatedReportsQueryDto,
  type DetailReportsQueryDto,
  type GenerateReportDto,
  ReportFormat,
  ReportGroupBy,
  ReportType,
} from './dto/query-reports.dto';
import { ReportsController } from './reports.controller';

import type { ReportsService } from "./reports.service";
import type { JwtPayload } from "../common/decorators/current-user.decorator";

describe('ReportsController', () => {
  const reportsService = {
    getConsolidated: jest.fn(),
    getDetail: jest.fn(),
    createJob: jest.fn(),
    getJobStatus: jest.fn(),
    downloadReport: jest.fn(),
  } as unknown as ReportsService;

  const controller = new ReportsController(reportsService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the consolidated query dto to the service', async () => {
    const query = {
      page: 2,
      limit: 5,
      search: 'enero',
      from: '2026-01-01',
      to: '2026-01-31',
      groupBy: ReportGroupBy.MONTH,
      type: ReportType.ALL,
    } as ConsolidatedReportsQueryDto;

    (reportsService.getConsolidated as jest.Mock).mockResolvedValue({ data: [], meta: {} });

    await controller.getConsolidated({ tenantId: 'tenant-1' } as JwtPayload, query);

    expect(reportsService.getConsolidated).toHaveBeenCalledWith('tenant-1', query);
  });

  it('passes the detail query dto to the service', async () => {
    const query = {
      page: 1,
      limit: 10,
      search: 'maria',
      from: '2026-01-01',
      to: '2026-01-31',
      groupBy: ReportGroupBy.DAY,
      type: ReportType.CONSULTATION,
    } as DetailReportsQueryDto;

    (reportsService.getDetail as jest.Mock).mockResolvedValue({ data: [], meta: {} });

    await controller.getDetail({ tenantId: 'tenant-1' } as JwtPayload, query);

    expect(reportsService.getDetail).toHaveBeenCalledWith('tenant-1', query);
  });

  it('passes generate dto through unchanged', async () => {
    const dto: GenerateReportDto = {
      from: '2026-01-01',
      to: '2026-01-31',
      type: ReportType.ALL,
      format: ReportFormat.PDF,
      groupBy: ReportGroupBy.DAY,
    };

    (reportsService.createJob as jest.Mock).mockResolvedValue({ jobId: 'job-1' });

    await controller.generate({ tenantId: 'tenant-1', sub: 'user-1' } as JwtPayload, dto);

    expect(reportsService.createJob).toHaveBeenCalledWith('tenant-1', 'user-1', dto);
  });
});
