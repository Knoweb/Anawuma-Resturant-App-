import { IsInt, IsNotEmpty, IsOptional, IsString, IsArray, ValidateNested, Min, Max, ArrayMaxSize, IsEnum, IsNumber, ValidateIf, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { DiningType, OrderType } from '../entities/order.entity';

export class CreateOrderItemDto {
  @IsInt()
  @IsNotEmpty()
  foodItemId: number;

  @IsInt()
  @IsNotEmpty()
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(20, { message: 'Quantity cannot exceed 20 per item' })
  qty: number;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Extra price cannot be negative' })
  extraPrice?: number;

  @ValidateIf((o) => Number(o.extraPrice) > 0)
  @IsNotEmpty({ message: 'Description is required when extra charge is applied' })
  @IsString()
  @MaxLength(255)
  extraDescription?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateOrderDto {
  @IsString()
  @IsOptional()
  tableNo?: string;

  @IsString()
  @IsOptional()
  roomNo?: string;

  @IsString()
  @IsOptional()
  orderType?: OrderType;

  @IsEnum(DiningType)
  @IsOptional()
  diningType?: DiningType;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  whatsappNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ArrayMaxSize(50, { message: 'Maximum 50 items per order allowed' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
