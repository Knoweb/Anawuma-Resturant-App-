import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HousekeepingRequest } from './entities/housekeeping-request.entity';
import { RoomQr } from '../room-qr/entities/room-qr.entity';
import { HousekeepingService } from './housekeeping.service';
import {
  HousekeepingPublicController,
  HousekeepingAdminController,
} from './housekeeping.controller';
import { RoomQrModule } from '../room-qr/room-qr.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HousekeepingRequest, RoomQr]),
    RoomQrModule, // For room key validation
    RestaurantsModule, // For FeatureFlagGuard
    WebsocketModule,
  ],
  controllers: [HousekeepingPublicController, HousekeepingAdminController],
  providers: [HousekeepingService],
  exports: [HousekeepingService],
})
export class HousekeepingModule {}
