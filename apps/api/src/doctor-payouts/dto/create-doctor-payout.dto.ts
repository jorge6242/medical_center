import { Currency, PaymentMethod } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateDoctorPayoutDto {
  @IsString()
  @IsNotEmpty()
  declare doctorId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  declare paymentIds: string[];

  @IsEnum(PaymentMethod)
  declare paymentMethod: PaymentMethod;

  @IsEnum(Currency)
  declare currency: Currency;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  declare bcvExchangeRate: number;

  @ValidateIf(
    (dto: CreateDoctorPayoutDto) => dto.paymentMethod === 'PAGO_MOVIL',
  )
  @IsString()
  declare referenceNumber?: string;

  @IsString()
  @IsOptional()
  declare bankName?: string;

  @IsString()
  @IsOptional()
  declare accountNumber?: string;

  @IsString()
  @IsOptional()
  declare bankPhone?: string;
}
