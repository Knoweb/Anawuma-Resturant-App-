import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { BillActionType } from '../entities/bill-action.entity';

export class RecordBillActionDto {
  @IsNumber()
  invoiceId: number;

  @IsNumber()
  orderId: number;

  @IsEnum(BillActionType)
  actionType: BillActionType;

  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BillActionHistoryDto {
  billActionId: string;
  invoiceId: number;
  orderId: number;
  actionType: BillActionType;
  userId: number | null;
  deviceInfo: string | null;
  createdAt: Date;
  notes: string | null;
}
