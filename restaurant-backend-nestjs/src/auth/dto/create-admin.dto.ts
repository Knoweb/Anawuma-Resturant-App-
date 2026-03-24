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
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
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
