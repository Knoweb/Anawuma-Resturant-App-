import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodItemsService } from './food-items.service';
import { FoodItemsController } from './food-items.controller';
import { FoodItem } from './entities/food-item.entity';
import { Category } from '../categories/entities/category.entity';
import { Subcategory } from '../subcategories/entities/subcategory.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FoodItem, Category, Subcategory])],
  controllers: [FoodItemsController],
  providers: [FoodItemsService],
  exports: [FoodItemsService],
})
export class FoodItemsModule {}
