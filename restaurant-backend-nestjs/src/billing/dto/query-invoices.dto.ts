import { IsOptional, IsString, IsEnum } from 'class-validator';
import { InvoiceStatus } from '../entities/invoice.entity';

export class QueryInvoicesDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  from?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  to?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  tableNo?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;
}
