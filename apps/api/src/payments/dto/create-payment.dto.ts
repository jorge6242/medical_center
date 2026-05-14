import { Currency, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PaymentLineDto {
  @IsEnum(PaymentMethod)
  declare paymentMethod: PaymentMethod;

  @IsEnum(Currency)
  declare currency: Currency;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  declare amount: number;

  @IsOptional()
  @IsString()
  declare referenceNumber?: string;
}

export class CreatePaymentDto {
  @IsUUID('4')
  declare idempotencyKey: string;

  @IsString()
  declare patientId: string;

  @IsString()
  declare doctorId: string;

  @IsArray()
  @IsString({ each: true })
  declare servicePriceIds: string[];

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  declare bcvExchangeRate: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentLineDto)
  declare paymentLines: PaymentLineDto[];
}

export class VoidPaymentDto {
  @IsString()
  @MinLength(5)
  declare reason: string;
}
