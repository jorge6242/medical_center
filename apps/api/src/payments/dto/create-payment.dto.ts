import { Currency, ItemType, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  ArrayMinSize,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
  ValidateBy,
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

  @ValidateIf(
    (line: PaymentLineDto) =>
      line.paymentMethod === 'PAGO_MOVIL' || line.referenceNumber != null,
  )
  @IsString()
  @ValidateBy({
    name: 'mobilePaymentReference',
    validator: {
      validate: (value: unknown, args) =>
        (args?.object as PaymentLineDto).paymentMethod !== 'PAGO_MOVIL' ||
        (typeof value === 'string' && value.trim().length > 0),
      defaultMessage: () => 'Referencia requerida para Pago Móvil',
    },
  })
  declare referenceNumber?: string;
}

export class PaymentItemDto {
  @IsEnum(ItemType)
  declare itemType: ItemType;

  @IsString()
  declare description: string;

  @ValidateIf(
    (o: PaymentItemDto) => o.itemType === 'CONSULTATION' && !o.consultationId,
  )
  @IsString()
  declare doctorId?: string;

  @ValidateIf(
    (o: PaymentItemDto) => o.itemType === 'CONSULTATION' && !o.consultationId,
  )
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  declare doctorServiceIds?: string[];

  @IsOptional()
  @IsUUID('4')
  declare consultationId?: string;

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

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  declare consultationDate?: Date;

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
