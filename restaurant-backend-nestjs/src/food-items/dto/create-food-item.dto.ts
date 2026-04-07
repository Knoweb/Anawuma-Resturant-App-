import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFoodItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  itemName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  moreDetails?: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @IsInt()
  @IsOptional()
  currencyId?: number;

  @IsInt()
  @IsNotEmpty()
  categoryId: number;

  @IsInt()
  @IsOptional()
  subcategoryId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  imageUrl1?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  imageUrl2?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  imageUrl3?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  imageUrl4?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  videoLink?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  blogLink?: string;
}
