import { LabOrderStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class LabOrderQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(LabOrderStatus)
  status?: LabOrderStatus;
}
