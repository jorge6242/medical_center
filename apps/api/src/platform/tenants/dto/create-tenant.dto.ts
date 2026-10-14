import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class InitialAdminDto {
  @IsString()
  @Length(1, 120)
  declare name: string;

  @IsEmail()
  declare email: string;

  @IsString()
  @Length(8, 128)
  declare password: string;
}

class InitialSubscriptionDto {
  @IsString()
  @Length(1, 50)
  declare planCode: string;

  @IsString()
  @Length(1, 20)
  declare agreedPriceUsd: string;

  @IsDateString()
  declare startsAt: string;

  @IsDateString()
  declare dueAt: string;

  @IsInt()
  @Min(0)
  @Max(30)
  declare gracePeriodDays: number;
}

export class CreateTenantDto {
  @IsString()
  @Length(1, 120)
  declare name: string;

  @IsString()
  @Length(3, 63)
  declare slug: string;

  @IsString()
  @Length(3, 63)
  declare webSlug: string;

  @IsOptional()
  @IsEmail()
  declare email?: string;

  @ValidateNested()
  @Type(() => InitialAdminDto)
  declare initialAdmin: InitialAdminDto;

  @ValidateNested()
  @Type(() => InitialSubscriptionDto)
  declare initialSubscription: InitialSubscriptionDto;
}
