import { IsString, IsNotEmpty, MaxLength, IsInt, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  categoryName: string;

  @IsInt()
  @IsNotEmpty()
  menuId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  imageUrl?: string;
}
