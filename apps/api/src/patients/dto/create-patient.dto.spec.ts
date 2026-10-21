import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CreatePatientDto } from './create-patient.dto';
import { UpdatePatientDto } from './update-patient.dto';

describe('CreatePatientDto', () => {
  it.each([undefined, '', '12345'])(
    'rejects invalid minor document %s on create and update',
    (documentId) => {
      for (const Dto of [CreatePatientDto, UpdatePatientDto]) {
        const dto = plainToInstance(Dto, {
          documentType: 'M',
          documentId,
          name: 'Paciente menor',
        });
        expect(
          validateSync(dto).some((error) => error.property === 'documentId'),
        ).toBe(true);
      }
    },
  );
  it('accepts a document identifier without a maximum length restriction', () => {
    const dto = plainToInstance(CreatePatientDto, {
      documentType: 'V',
      documentId: '3423432423423',
      name: 'Paciente de prueba',
    });

    expect(validateSync(dto)).toHaveLength(0);
  });
});
