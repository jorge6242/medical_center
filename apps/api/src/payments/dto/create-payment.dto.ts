import { Currency, ItemType, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
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

export class PaymentItemDto {
  @IsEnum(ItemType)
  declare itemType: ItemType;

  @IsString()
  declare description: string;

  @ValidateIf((o) => o.itemType === 'CONSULTATION')
  @IsString()
  declare doctorId?: string;

  @ValidateIf((o) => o.itemType === 'CONSULTATION')
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  declare servicePriceIds?: string[];

  @ValidateIf((o) => o.itemType === 'LAB')
  @IsString()
  declare labOrderId?: string;
}

export class CreatePaymentDto {
  @IsUUID('4')
  declare idempotencyKey: string;

  @IsString()
  declare patientId: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  declare bcvExchangeRate: number;

  @ValidateNested()
  @Type(() => PaymentItemDto)
  declare item: PaymentItemDto;

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
