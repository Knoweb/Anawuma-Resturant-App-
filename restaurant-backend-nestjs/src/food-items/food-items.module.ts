import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodItemsService } from './food-items.service';
import { FoodItemsController } from './food-items.controller';
import { FoodItem } from './entities/food-item.entity';
import { Category } from '../categories/entities/category.entity';
import { Subcategory } from '../subcategories/entities/subcategory.entity';
import { Menu } from '../menus/entities/menu.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Offer } from '../offers/entities/offer.entity';
import { RestaurantsModule } from '../restaurants/restaurants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FoodItem, Category, Subcategory, Menu, OrderItem, Offer]),
    RestaurantsModule,
  ],
  controllers: [FoodItemsController],
  providers: [FoodItemsService],
  exports: [FoodItemsService],
})
export class FoodItemsModule {}
