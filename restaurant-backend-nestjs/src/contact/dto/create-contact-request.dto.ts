import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsEmail,
} from 'class-validator';

export class CreateContactRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  hotelName?: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  emailAddress: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  website?: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
