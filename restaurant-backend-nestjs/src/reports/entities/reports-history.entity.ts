import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity('reports_history_tbl')
export class ReportsHistory {
  @PrimaryGeneratedColumn({ name: 'report_id' })
  reportId: number;

  @Column({ name: 'restaurant_id' })
  restaurantId: number;

  @Column({ name: 'report_type', length: 50 })
  reportType: string; // 'daily' or 'range'

  @Column({ name: 'from_date', type: 'date', nullable: true })
  fromDate: string;

  @Column({ name: 'to_date', type: 'date', nullable: true })
  toDate: string;

  @Column({ name: 'total_orders', type: 'int', default: 0 })
  totalOrders: number;

  @Column({ name: 'total_revenue', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalRevenue: number;

  @CreateDateColumn({ name: 'generated_at' })
  generatedAt: Date;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;
}
