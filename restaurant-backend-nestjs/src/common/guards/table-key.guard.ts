import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TableQrService } from '../../table-qr/table-qr.service';
import { RoomQrService } from '../../room-qr/room-qr.service';

@Injectable()
export class TableKeyGuard implements CanActivate {
  constructor(
    private readonly tableQrService: TableQrService,
    private readonly roomQrService: RoomQrService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tableKey = request.headers['x-table-key'] || request.query['tableKey'];
    const roomKey = request.headers['x-room-key'] || request.query['roomKey'];

    if (!tableKey && !roomKey) {
      throw new UnauthorizedException('QR key is required');
    }

    try {
      if (tableKey) {
        const tableInfo = await this.tableQrService.resolveTableInfo(tableKey);
        request.restaurantId = tableInfo.restaurantId;
        request.tableNo = tableInfo.tableNo;
        request.tableKey = tableKey;
        request.orderType = 'TABLE';
      } else if (roomKey) {
        const roomInfo = await this.roomQrService.resolveRoomInfo(roomKey);
        request.restaurantId = roomInfo.restaurantId;
        request.roomNo = roomInfo.roomNo;
        request.roomKey = roomKey;
        request.orderType = 'ROOM';
      }
      
      return true;
    } catch (error) {
      throw new UnauthorizedException(error.message || 'Invalid or inactive QR code');
    }
  }
}
