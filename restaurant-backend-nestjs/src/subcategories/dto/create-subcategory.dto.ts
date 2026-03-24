import { IsString, IsNotEmpty, IsInt, MaxLength } from 'class-validator';

export class CreateSubcategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  subcategoryName: string;

  @IsInt()
  @IsNotEmpty()
  categoryId: number;
}
