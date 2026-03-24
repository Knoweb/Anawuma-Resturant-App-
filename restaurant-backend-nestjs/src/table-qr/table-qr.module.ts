import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TableQr } from './entities/table-qr.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { TableQrService } from './table-qr.service';
import { TableQrController, QrResolveController } from './table-qr.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TableQr, Restaurant])],
  controllers: [TableQrController, QrResolveController],
  providers: [TableQrService],
  exports: [TableQrService],
})
export class TableQrModule {}
