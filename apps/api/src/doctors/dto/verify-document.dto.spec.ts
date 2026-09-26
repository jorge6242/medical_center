import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { VerifyDocumentDto } from './verify-document.dto';

describe('VerifyDocumentDto', () => {
  it('accepts document identifiers longer than twelve characters', () => {
    const dto = plainToInstance(VerifyDocumentDto, {
      documentType: 'V',
      documentId: '5345435345435',
    });

    expect(validateSync(dto)).toHaveLength(0);
  });
});
