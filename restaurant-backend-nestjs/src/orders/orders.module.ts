import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { FoodItem } from '../food-items/entities/food-item.entity';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { TableQrModule } from '../table-qr/table-qr.module';
import { RoomQrModule } from '../room-qr/room-qr.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, FoodItem]),
    RestaurantsModule, // Import for ApiKeyGuard
    TableQrModule, // Import for TableKeyGuard
    RoomQrModule, // Import for RoomQr handling (Room Orders)
    WebsocketModule, // Import for real-time updates
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
