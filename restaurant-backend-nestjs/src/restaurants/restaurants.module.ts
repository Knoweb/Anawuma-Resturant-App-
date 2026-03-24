import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantsService } from './restaurants.service';
import { RestaurantsController } from './restaurants.controller';
import { Restaurant } from './entities/restaurant.entity';
import { Admin } from '../auth/entities/admin.entity';
import { SettingsRequestsModule } from '../settings-requests/settings-requests.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Restaurant, Admin]),
    SettingsRequestsModule,
    WebsocketModule,
  ],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
  exports: [RestaurantsService], // Export so ApiKeyGuard can use it
})
export class RestaurantsModule {}
