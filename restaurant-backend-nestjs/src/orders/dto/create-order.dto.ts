import { IsInt, IsNotEmpty, IsOptional, IsString, IsArray, ValidateNested, Min, Max, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsInt()
  @IsNotEmpty()
  foodItemId: number;

  @IsInt()
  @IsNotEmpty()
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(20, { message: 'Quantity cannot exceed 20 per item' })
  qty: number;

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
