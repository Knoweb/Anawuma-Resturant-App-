import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { FoodItem } from '../../food-items/entities/food-item.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity('offers_tbl')
export class Offer {
  @PrimaryGeneratedColumn({ name: 'offer_id' })
  offerId: number;

  @Column({ name: 'restaurant_id' })
  restaurantId: number;

  @Column({ length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'image_url', length: 500, nullable: true })
  imageUrl: string;

  @Column({
    name: 'discount_type',
    type: 'enum',
    enum: ['PERCENTAGE', 'FIXED'],
  })
  discountType: string;

  @Column({
    name: 'discount_value',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  discountValue: number;

  @Column({ name: 'start_date', type: 'datetime' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'datetime' })
  endDate: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @ManyToMany(() => FoodItem, (foodItem) => foodItem.offers)
  @JoinTable({
    name: 'offer_food_items_tbl',
    joinColumn: { name: 'offer_id', referencedColumnName: 'offerId' },
    inverseJoinColumn: { name: 'food_item_id', referencedColumnName: 'foodItemId' },
  })
  foodItems: FoodItem[];
}
