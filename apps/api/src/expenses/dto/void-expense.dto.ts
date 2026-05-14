import { IsString, MinLength } from 'class-validator';

export class VoidExpenseDto {
  @IsString()
  @MinLength(5)
  declare reason: string;
}
