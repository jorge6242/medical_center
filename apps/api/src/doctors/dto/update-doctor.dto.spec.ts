import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CreateBankAccountDto } from './create-doctor.dto';
import { UpdateBankAccountDto } from './update-doctor.dto';

describe('UpdateBankAccountDto', () => {
  it('accepts a required document identifier without a length restriction', () => {
    const dto = plainToInstance(UpdateBankAccountDto, {
      documentId: '5435353543543',
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('requires a document identifier when updating bank account data', () => {
    const dto = plainToInstance(UpdateBankAccountDto, {
      bankName: 'Banesco',
    });

    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it('accepts a document identifier without a length restriction when creating', () => {
    const dto = plainToInstance(CreateBankAccountDto, {
      bankName: 'Banesco',
      accountType: 'SAVINGS',
      documentId: '5435353543543',
    });

    expect(validateSync(dto)).toHaveLength(0);
  });
});
