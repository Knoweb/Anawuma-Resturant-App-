import { IsNumber, IsOptional, Min } from 'class-validator';

export class CreateInvoiceDto {
  @IsNumber()
  orderId: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceCharge?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}
