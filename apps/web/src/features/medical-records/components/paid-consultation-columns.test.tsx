import { render, screen, within } from '@testing-library/react';

import { DataTable } from '@/shared/components/ui/data-table';

import type { PaidConsultation } from '../services/medical-records.service';
import { getPaidConsultationColumns } from './paid-consultation-columns';

const consultation: PaidConsultation = {
  id: 'consultation-1',
  date: '2026-10-19T13:15:00Z',
  status: 'PAID',
  patientId: 'patient-1',
  patientName: 'Adam Gomez',
  patientDocument: 'M-20261001E51C',
  doctorId: 'doctor-1',
  doctorName: 'Nina',
  doctorDocument: 'V-18934576',
  services: [],
  medicalRecordId: null,
  canCreateMedicalRecord: false,
};

it('enlaza nombre y documento del paciente al detalle de su consulta', () => {
  render(
    <DataTable
      data={[consultation]}
      columns={getPaidConsultationColumns()}
      pagination={{ pageIndex: 0, pageSize: 10 }}
      onPaginationChange={() => undefined}
      pageCount={1}
      rowCount={1}
    />,
  );

  const link = screen.getByRole('link', { name: `Ver consulta de ${consultation.patientName}` });
  expect(link).toHaveAttribute('href', `/consultas/${consultation.id}`);
  expect(within(link).getByText(consultation.patientName)).toBeInTheDocument();
  expect(within(link).getByText(consultation.patientDocument)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ver detalle' })).toHaveAttribute(
    'href',
    `/consultas/${consultation.id}`,
  );
});
