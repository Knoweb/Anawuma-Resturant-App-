import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomQr } from './entities/room-qr.entity';
import { RoomQrService } from './room-qr.service';
import { RoomQrController, RoomQrResolveController } from './room-qr.controller';
import { RestaurantsModule } from '../restaurants/restaurants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoomQr]),
    RestaurantsModule, // For FeatureFlagGuard
  ],
  controllers: [RoomQrController, RoomQrResolveController],
  providers: [RoomQrService],
  exports: [RoomQrService],
})
export class RoomQrModule {}
