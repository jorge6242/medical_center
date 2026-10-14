import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const STATUSES = [
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'SUSPENDED',
  'CANCELED',
] as const;

export class UpdateContractDto {
  @IsOptional()
  @IsString()
  @Length(1, 20)
  declare agreedPriceUsd?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  declare gracePeriodDays?: number;

  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== null)
  @IsDateString()
  declare promoExpiresAt?: string | null;

  @IsString()
  @Length(1, 500)
  declare reason: string;

  @IsInt()
  @Min(1)
  declare expectedVersion: number;
}

export class ChangeStatusDto {
  @IsIn(STATUSES)
  declare status: (typeof STATUSES)[number];

  @IsString()
  @Length(1, 500)
  declare reason: string;

  @IsInt()
  @Min(1)
  declare expectedVersion: number;
}

export class CreatePeriodDto {
  @IsString()
  @Length(1, 50)
  declare planCode: string;

  @IsDateString()
  declare startsAt: string;

  @IsDateString()
  declare dueAt: string;
}

export class RegisterPaymentDto {
  @IsIn(['USD', 'VES'])
  declare currency: 'USD' | 'VES';

  @IsString()
  @Length(1, 20)
  declare amountPaid: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  declare rate?: string | null;

  @IsString()
  @Length(1, 50)
  declare method: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  declare reference?: string;

  @IsDateString()
  declare paidAt: string;
}

export class VoidPaymentDto {
  @IsString()
  @Length(1, 500)
  declare reason: string;
}
