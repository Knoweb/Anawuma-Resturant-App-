import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateTableQrDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tableNo: string;
}
