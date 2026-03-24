import { PartialType } from '@nestjs/mapped-types';
import { CreateRestaurantDto } from './create-restaurant.dto';
import { IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class UpdateRestaurantDto extends PartialType(CreateRestaurantDto) {
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  subscriptionStatus?: 'active' | 'inactive';

  @IsOptional()
  subscriptionExpiryDate?: string;

  @IsOptional()
  @IsBoolean()
  enableHousekeeping?: boolean;

  @IsOptional()
  @IsBoolean()
  enableKds?: boolean;

  @IsOptional()
  @IsBoolean()
  enableReports?: boolean;

  @IsOptional()
  @IsBoolean()
  enableAccountant?: boolean;

  @IsOptional()
  @IsBoolean()
  enableCashier?: boolean;
}
