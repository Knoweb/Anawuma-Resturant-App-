import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateMenuDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  menuName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  imageUrl?: string;
}
