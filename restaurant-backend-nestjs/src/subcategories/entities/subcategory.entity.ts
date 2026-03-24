import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { FoodItem } from '../../food-items/entities/food-item.entity';

@Entity('subcategory_tbl')
export class Subcategory {
  @PrimaryGeneratedColumn({ name: 'subcategory_id' })
  subcategoryId: number;

  @Column({ name: 'subcategory_name', length: 20 })
  subcategoryName: string;

  @Column({ name: 'parent_category_id' })
  categoryId: number;

  @Column({ name: 'restaurant_id' })
  restaurantId: number;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'parent_category_id' })
  category: Category;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @OneToMany(() => FoodItem, (foodItem) => foodItem.subcategory, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  foodItems: FoodItem[];
}
