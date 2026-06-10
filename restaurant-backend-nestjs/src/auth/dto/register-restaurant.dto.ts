import {
  IsEmail,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'on') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'off') {
      return false;
    }
  }

  return Boolean(value);
};

export class RegisterRestaurantDto {
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
  @Matches(/^[0-9]{10}$/, {
    message: 'Contact number must be a valid 10-digit number',
  })
  contactNumber: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Confirm password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Confirm password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  confirmPassword: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Opening time must be in HH:MM format',
  })
  openingTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Closing time must be in HH:MM format',
  })
  closingTime: string;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  enableHousekeeping?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  enableKds?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  enableReports?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  enableAccountant?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  enableCashier?: boolean;
}