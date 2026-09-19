import type { LabOrderStatus } from '@prisma/client';

export interface LabOrderListResponseDto {
  id: string;
  patientName: string;
  totalUsd: string;
  status: LabOrderStatus;
  createdAt: string;
}

export interface LabOrderDetailResponseDto {
  id: string;
  patient: {
    id: string;
    name: string;
    documentType: string;
    documentId: string;
  };
  tests: Array<{
    labTestId: string;
    testName: string;
    priceUsd: string;
  }>;
  totalUsd: string;
  status: LabOrderStatus;
  createdAt: string;
}
