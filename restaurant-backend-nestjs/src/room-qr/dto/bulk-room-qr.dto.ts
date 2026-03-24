import { IsNotEmpty, IsInt, Min, Max } from 'class-validator';

export class BulkRoomQrDto {
  @IsNotEmpty({ message: 'Room count is required' })
  @IsInt()
  @Min(1, { message: 'Room count must be at least 1' })
  @Max(500, { message: 'Room count cannot exceed 500' })
  roomCount: number;
}
