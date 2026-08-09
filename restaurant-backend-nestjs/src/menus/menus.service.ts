import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from './entities/menu.entity';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

import { FoodItem } from '../food-items/entities/food-item.entity';
import { Category } from '../categories/entities/category.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { In } from 'typeorm';

@Injectable()
export class MenusService {
  constructor(
    @InjectRepository(Menu)
    private menusRepository: Repository<Menu>,
    @InjectRepository(FoodItem)
    private foodItemsRepository: Repository<FoodItem>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
  ) { }

  async create(createMenuDto: CreateMenuDto, restaurantId: number): Promise<Menu> {
    const menu = this.menusRepository.create({
      ...createMenuDto,
      restaurantId,
    });

    const savedMenu = await this.menusRepository.save(menu);
    return this.resolveImageUrl(savedMenu);
  }

  async findAll(restaurantId: number): Promise<Menu[]> {
    const menus = await this.menusRepository.find({
      where: { restaurantId },
      order: { menuId: 'DESC' },
    });

    return menus.map((menu) => this.resolveImageUrl(menu));
  }

  async findOne(id: number, restaurantId: number): Promise<Menu> {
    const menu = await this.menusRepository.findOne({
      where: { menuId: id, restaurantId },
    });

    if (!menu) {
      throw new NotFoundException(`Menu with ID ${id} not found`);
    }

    return this.resolveImageUrl(menu);
  }

  async update(id: number, updateMenuDto: UpdateMenuDto, restaurantId: number): Promise<Menu> {
    const menu = await this.menusRepository.findOne({
      where: { menuId: id, restaurantId },
    });

    if (!menu) {
      throw new NotFoundException(`Menu with ID ${id} not found`);
    }

    Object.assign(menu, updateMenuDto);
    const updatedMenu = await this.menusRepository.save(menu);
    return this.resolveImageUrl(updatedMenu);
  }

  async remove(id: number, restaurantId: number): Promise<void> {
    const menu = await this.findOne(id, restaurantId);

    // Find all food items for this menu
    const foodItems = await this.foodItemsRepository.find({
      where: { menuId: id },
    });

    if (foodItems.length > 0) {
      const foodItemIds = foodItems.map((item) => item.foodItemId);
      // Nullify all related order items to preserve history
      await this.orderItemsRepository.update({ foodItemId: In(foodItemIds) }, { foodItemId: null });
      // Delete all related food items
      if (foodItemIds.length > 0) {
        await this.foodItemsRepository.query(`DELETE FROM offer_food_items_tbl WHERE food_item_id IN (${foodItemIds.join(',')})`);
      }
      await this.foodItemsRepository.delete({ foodItemId: In(foodItemIds) });
    }

    // Set menuId to NULL for any categories linked to this menu (if ANY)
    // Actually, usually categories are tied to menus. If we delete menu, categories might stay but with NULL menuId.
    // Or we delete categories too? User said "me item tika delete karala danna".
    // I'll delete categories tied to this menu as well.
    await this.categoriesRepository.delete({ menuId: id });

    await this.menusRepository.remove(menu);
  }

  // Super admin can access all menus
  async findAllForSuperAdmin(): Promise<Menu[]> {
    const menus = await this.menusRepository.find({
      relations: ['restaurant'],
      order: { menuId: 'DESC' },
    });

    return menus.map((menu) => this.resolveImageUrl(menu));
  }

  private resolveImageUrl(menu: Menu): Menu {
    if (menu.imageUrl && !menu.imageUrl.startsWith('http')) {
      const baseUrl = process.env.API_URL || 'http://localhost:3000';
      menu.imageUrl = `${baseUrl}${menu.imageUrl}`;
    }
    return menu;
  }
}
