import { IsNumber, IsOptional, Min, IsEnum, IsString } from 'class-validator';
import { PaymentMethod } from '../entities/invoice.entity';
import { CheckoutDiscountType } from './finalize-checkout.dto';
import { DiningType } from '../../orders/entities/order.entity';

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
  @IsEnum(CheckoutDiscountType)
  discountType?: CheckoutDiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsString()
  discountReason?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(DiningType)
  diningType?: DiningType;
}
