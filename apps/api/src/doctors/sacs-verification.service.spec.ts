import { SacsVerificationService } from './sacs-verification.service';

describe('SacsVerificationService', () => {
  const service = new SacsVerificationService({} as never);

  it('rejects an identified person who has no SACS professional registration', () => {
    const result = service.parseResponse(
      `xajax_userTable('{"nombre1":"Gladys","apellido1":"Duran"}');xajax_tableProfesion('[]');`,
    );

    expect(result).toMatchObject({
      found: false,
      verificationStatus: 'REJECTED',
      doctorName: 'Gladys Duran',
    });
  });

  it('verifies only when SACS returns a professional registration', () => {
    const result = service.parseResponse(
      `xajax_userTable('{"nombre1":"Ana","apellido1":"Pérez"}');xajax_tableProfesion('[{"profesion":"Medicina","licencia":"MPPS-123"}]');`,
    );

    expect(result).toMatchObject({
      found: true,
      verificationStatus: 'VERIFIED',
      specialty: 'Medicina',
      licenseNumber: 'MPPS-123',
    });
  });
});
