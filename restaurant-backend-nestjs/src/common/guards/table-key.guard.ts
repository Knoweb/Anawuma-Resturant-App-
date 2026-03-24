import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TableQrService } from '../../table-qr/table-qr.service';

@Injectable()
export class TableKeyGuard implements CanActivate {
  constructor(private readonly tableQrService: TableQrService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tableKey = request.headers['x-table-key'] || request.query['tableKey'];

    if (!tableKey) {
      throw new UnauthorizedException('Table key is required');
    }

    try {
      const tableInfo = await this.tableQrService.resolveTableInfo(tableKey);
      
      // Attach resolved info to request for use in controller
      request.restaurantId = tableInfo.restaurantId;
      request.tableNo = tableInfo.tableNo;
      request.tableKey = tableKey;

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or inactive table QR code');
    }
  }
}
