import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { RequestType } from '../entities/housekeeping-request.entity';

export class CreateHousekeepingRequestDto {
  @IsEnum(RequestType)
  requestType: RequestType;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Message cannot exceed 1000 characters' })
  message?: string;
}
