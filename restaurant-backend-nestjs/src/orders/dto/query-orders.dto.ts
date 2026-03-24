import { IsOptional, IsEnum, IsString, Matches } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class QueryOrdersDto {
  @IsOptional()
  @IsEnum(OrderStatus, {
    message: 'Status must be one of: NEW, ACCEPTED, COOKING, READY, SERVED, CANCELLED',
  })
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from must be in YYYY-MM-DD format',
  })
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to must be in YYYY-MM-DD format',
  })
  to?: string;

  @IsOptional()
  @IsString()
  tableNo?: string;

  @IsOptional()
  @IsString()
  orderNo?: string;
}
