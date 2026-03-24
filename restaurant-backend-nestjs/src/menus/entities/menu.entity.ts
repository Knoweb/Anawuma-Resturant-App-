import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity('menu_tbl')
export class Menu {
  @PrimaryGeneratedColumn({ name: 'menu_id' })
  menuId: number;

  @Column({ name: 'menu_name', length: 20 })
  menuName: string;

  @Column({ length: 500 })
  description: string;

  @Column({ name: 'image_url', length: 255 })
  imageUrl: string;

  @Column({ name: 'restaurant_id' })
  restaurantId: number;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;
}
