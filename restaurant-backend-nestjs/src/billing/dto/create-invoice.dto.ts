import { IsNumber, IsOptional, Min, IsEnum } from 'class-validator';
import { PaymentMethod } from '../entities/invoice.entity';

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

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
