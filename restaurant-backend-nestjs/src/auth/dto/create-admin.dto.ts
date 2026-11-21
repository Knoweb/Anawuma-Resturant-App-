import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsIn,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class CreateAdminDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString({ message: 'Password must be text' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsIn(['admin', 'super_admin', 'housekeeper', 'kitchen', 'cashier', 'accountant', 'steward'], {
    message: 'Invalid role selected',
  })
  @IsNotEmpty({ message: 'Role is required' })
  role:
    | 'admin'
    | 'super_admin'
    | 'housekeeper'
    | 'kitchen'
    | 'cashier'
    | 'accountant'
    | 'steward';

  @IsNumber()
  @IsOptional()
  restaurantId?: number;
}
