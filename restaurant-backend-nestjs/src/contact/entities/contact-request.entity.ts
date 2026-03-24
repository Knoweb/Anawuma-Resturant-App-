import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('contact_requests_tbl')
export class ContactRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({ name: 'phone_number', length: 50, nullable: true })
  phoneNumber: string;

  @Column({ name: 'hotel_name', length: 255, nullable: true })
  hotelName: string;

  @Column({ name: 'email_address', length: 255 })
  emailAddress: string;

  @Column({ length: 255 })
  subject: string;

  @Column({ length: 255, nullable: true })
  website: string;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
