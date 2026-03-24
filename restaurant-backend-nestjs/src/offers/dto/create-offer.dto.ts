import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';

export class CreateOfferDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  imageUrl?: string;

  @IsEnum(['PERCENTAGE', 'FIXED'], {
    message: 'Discount type must be either PERCENTAGE or FIXED',
  })
  @IsNotEmpty()
  discountType: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0, { message: 'Discount value must be a positive number' })
  discountValue: number;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsOptional()
  isActive?: boolean;
}
