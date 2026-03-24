import { IsEnum, IsNotEmpty } from 'class-validator';
import { RequestStatus } from '../entities/housekeeping-request.entity';

export class UpdateHousekeepingStatusDto {
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(RequestStatus)
  status: RequestStatus;
}
