import { IsEnum, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class DoctorPayoutQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(['COMPLETED', 'VOIDED'] as const)
  declare status?: 'COMPLETED' | 'VOIDED';
}
