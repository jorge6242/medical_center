import { IsDateString, IsOptional, Matches } from 'class-validator';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ConsultationsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  date?: string;
}
