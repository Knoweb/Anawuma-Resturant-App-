import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  NEW = 'NEW',
  ACCEPTED = 'ACCEPTED',
  COOKING = 'COOKING',
  READY = 'READY',
  BILLED = 'BILLED',
  SERVED = 'SERVED',
  CANCELLED = 'CANCELLED',
}

@Entity('kitchen_orders_tbl')
export class Order {
  @PrimaryGeneratedColumn({ name: 'order_id' })
  orderId: number;

  @Column({ name: 'order_no', type: 'varchar', length: 50, unique: true, nullable: true })
  orderNo: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 255, nullable: true })
  customerName: string;

  @Column({ name: 'whatsapp_number', type: 'varchar', length: 50, nullable: true })
  whatsappNumber: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.NEW,
  })
  status: OrderStatus;

  @Column({ name: 'table_no', type: 'varchar', length: 50, nullable: true })
  tableNo: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ name: 'restaurant_id', type: 'int' })
  restaurantId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    cascade: true,
    eager: true,
  })
  orderItems: OrderItem[];
}
