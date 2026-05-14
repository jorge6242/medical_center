import { IsNumber, IsOptional, IsPositive, IsString, IsUUID, Length } from 'class-validator';

export class CreateExpenseDto {
  @IsUUID('4')
  declare categoryId: string;

  @IsString()
  @Length(2, 200)
  declare description: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  declare amountUsd: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  declare amountBs?: number;
}
