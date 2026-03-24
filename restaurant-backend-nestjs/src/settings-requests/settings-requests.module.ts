import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsRequestsService } from './settings-requests.service';
import { SettingsRequestsController } from './settings-requests.controller';
import { SettingsRequest } from './entities/settings-request.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SettingsRequest, Restaurant]),
    WebsocketModule,
  ],
  controllers: [SettingsRequestsController],
  providers: [SettingsRequestsService],
  exports: [SettingsRequestsService],
})
export class SettingsRequestsModule {}
