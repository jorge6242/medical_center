import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CreatePatientDto } from './create-patient.dto';

describe('CreatePatientDto', () => {
  it('accepts a document identifier without a maximum length restriction', () => {
    const dto = plainToInstance(CreatePatientDto, {
      documentType: 'V',
      documentId: '3423432423423',
      name: 'Paciente de prueba',
    });

    expect(validateSync(dto)).toHaveLength(0);
  });
});
