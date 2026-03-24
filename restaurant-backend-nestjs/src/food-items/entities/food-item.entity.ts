import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Subcategory } from '../../subcategories/entities/subcategory.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity('food_items_tbl')
export class FoodItem {
  @PrimaryGeneratedColumn({ name: 'food_items_id' })
  foodItemId: number;

  @Column({ name: 'food_items_name', length: 100 })
  itemName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'more_details', type: 'text', nullable: true })
  moreDetails: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'currency_id', nullable: true })
  currencyId: number;

  @Column({ name: 'category_id' })
  categoryId: number;

  @Column({ name: 'subcategory_id', nullable: true })
  subcategoryId: number;

  @Column({ name: 'image_url_1', length: 255, nullable: true })
  imageUrl1: string;

  @Column({ name: 'image_url_2', length: 255, nullable: true })
  imageUrl2: string;

  @Column({ name: 'image_url_3', length: 255, nullable: true })
  imageUrl3: string;

  @Column({ name: 'image_url_4', length: 255, nullable: true })
  imageUrl4: string;

  @Column({ name: 'video_link', length: 255, nullable: true })
  videoLink: string;

  @Column({ name: 'blog_link', length: 255, nullable: true })
  blogLink: string;

  @Column({ name: 'restaurant_id' })
  restaurantId: number;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => Subcategory)
  @JoinColumn({ name: 'subcategory_id' })
  subcategory: Subcategory;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;
}
