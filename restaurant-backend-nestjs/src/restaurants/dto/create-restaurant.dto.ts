import {
  IsString,
  IsEmail,
  IsNotEmpty,
  Length,
  IsOptional,
  IsEnum,
  IsDateString,
  Matches,
} from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 255)
  restaurantName: string;

  @IsString()
  @IsNotEmpty()
  @Length(5, 255)
  address: string;

  @IsString()
  @IsNotEmpty()
  @ Matches(/^[0-9]{10,20}$/, { message: 'Contact number must be between 10-20 digits' })
  contactNumber: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Opening time must be in HH:MM format' })
  openingTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Closing time must be in HH:MM format' })
  closingTime?: string;

  @IsOptional()
  @IsDateString()
  subscriptionExpiryDate?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive'])
  subscriptionStatus?: 'active' | 'inactive';

  @IsOptional()
  @IsString()
  password?: string;

  // Feature flags
  @IsOptional()
  enableHousekeeping?: boolean;

  @IsOptional()
  enableKds?: boolean;

  @IsOptional()
  enableReports?: boolean;

  @IsOptional()
  enableAccountant?: boolean;

  @IsOptional()
  enableCashier?: boolean;
}
