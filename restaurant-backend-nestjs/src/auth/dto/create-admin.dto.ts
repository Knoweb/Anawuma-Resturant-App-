import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsIn,
  IsNumber,
  IsOptional,
  Matches,
} from 'class-validator';

export class CreateAdminDto {
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

  @IsIn(['admin', 'super_admin', 'housekeeper', 'kitchen', 'cashier', 'accountant', 'steward'])
  @IsNotEmpty()
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
