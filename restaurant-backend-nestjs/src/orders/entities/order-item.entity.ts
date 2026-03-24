import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { FoodItem } from '../../food-items/entities/food-item.entity';

@Entity('kitchen_order_items_tbl')
export class OrderItem {
  @PrimaryGeneratedColumn({ name: 'order_item_id' })
  orderItemId: number;

  @Column({ name: 'order_id', type: 'int' })
  orderId: number;

  @Column({ name: 'food_item_id', type: 'int' })
  foodItemId: number;

  @Column({ name: 'item_name', type: 'varchar', length: 100 })
  itemName: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'int' })
  qty: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 10, scale: 2 })
  lineTotal: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Order, (order) => order.orderItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => FoodItem, { nullable: true })
  @JoinColumn({ name: 'food_item_id' })
  foodItem: FoodItem;
}
