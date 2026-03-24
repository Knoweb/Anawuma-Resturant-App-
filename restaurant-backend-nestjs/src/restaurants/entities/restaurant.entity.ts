import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Admin } from '../../auth/entities/admin.entity';

@Entity('restaurant_tbl')
export class Restaurant {
  @PrimaryGeneratedColumn({ name: 'restaurant_id' })
  restaurantId: number;

  @Column({ name: 'restaurant_name', type: 'varchar', length: 255 })
  restaurantName: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ name: 'contact_number', type: 'varchar', length: 20 })
  contactNumber: string;

  @Column({
    name: 'subscription_status',
    type: 'enum',
    enum: ['active', 'inactive'],
    default: 'inactive',
  })
  subscriptionStatus: string;

  @Column({ name: 'subscription_expiry_date', type: 'timestamp', nullable: true })
  subscriptionExpiryDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'varchar', length: 65 })
  email: string;

  @Column({ name: 'opening_time', type: 'time' })
  openingTime: string;

  @Column({ name: 'closing_time', type: 'time' })
  closingTime: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ name: 'currency_id', nullable: true })
  currencyId: number;

  @Column({ name: 'country_id', nullable: true })
  countryId: number;

  @Column({ name: 'package_id', nullable: true })
  packageId: number;

  @Column({ name: 'api_key', type: 'varchar', length: 64, unique: true, nullable: true })
  apiKey: string | null;

  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
  })
  approvalStatus: string;

  // Feature flags for optional modules
  @Column({ name: 'enable_steward', type: 'tinyint', width: 1, default: 0 })
  enableSteward: boolean;

  @Column({ name: 'enable_housekeeping', type: 'tinyint', width: 1, default: 1 })
  enableHousekeeping: boolean;

  @Column({ name: 'enable_kds', type: 'tinyint', width: 1, default: 1 })
  enableKds: boolean;

  @Column({ name: 'enable_reports', type: 'tinyint', width: 1, default: 1 })
  enableReports: boolean;

  @Column({ name: 'enable_accountant', type: 'tinyint', width: 1, default: 1 })
  enableAccountant: boolean;

  @Column({ name: 'enable_cashier', type: 'tinyint', width: 1, default: 1 })
  enableCashier: boolean;

  @OneToMany(() => Admin, (admin) => admin.restaurant)
  admins: Admin[];
}
