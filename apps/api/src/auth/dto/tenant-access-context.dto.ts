import { IsString, MinLength } from 'class-validator';

export class TenantAccessContextDto {
  @IsString()
  @MinLength(32)
  declare accessToken: string;
}
