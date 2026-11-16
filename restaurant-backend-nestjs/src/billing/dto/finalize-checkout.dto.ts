import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod } from '../entities/invoice.entity';

export enum CheckoutDiscountType {
  NONE = 'NONE',
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export class FinalizeCheckoutDto {
  @IsArray()
  @IsNumber({}, { each: true })
  orderIds: number[];

  @IsString()
  identifier: string;

  @IsEnum(['ROOM', 'TABLE'])
  type: 'ROOM' | 'TABLE';

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

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
}
