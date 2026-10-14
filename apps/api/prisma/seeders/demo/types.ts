export { DEMO_TENANT_ID } from '../demo-tenant.constants';
export const DEMO_YEAR = new Date().getFullYear();

export type DemoDoctorRef = {
  id: string;
  name: string;
  documentType: 'V' | 'E' | 'J' | 'G';
  documentId: string;
};

export type DemoPatientRef = {
  id: string;
  name: string;
  documentType: 'V' | 'E' | 'J' | 'G';
  documentId: string;
};
