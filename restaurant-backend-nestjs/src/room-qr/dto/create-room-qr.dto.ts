import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRoomQrDto {
  @IsNotEmpty({ message: 'Room number is required' })
  @IsString()
  @MaxLength(50)
  roomNo: string;
}
