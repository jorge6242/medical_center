import { doctorAnaFixture, doctorServicesFixture } from './doctors.fixture';

const baseService = doctorServicesFixture[0];
if (!baseService) throw new Error('Falta fixture base de servicio');

export const paymentFormDoctors = [
  doctorAnaFixture,
  { ...doctorAnaFixture, id: 'doctor-b', name: 'Bruno' },
];
export const paymentFormServices = [
  ...doctorServicesFixture,
  { ...baseService, id: 'ds-extra', serviceName: 'Control', priceUsd: '25.00' },
];
export const secondDoctorServices = [
  { ...baseService, id: 'ds-b', serviceName: 'Consulta Bruno', priceUsd: '80.00' },
];
