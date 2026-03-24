import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from './entities/menu.entity';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

@Injectable()
export class MenusService {
  constructor(
    @InjectRepository(Menu)
    private menusRepository: Repository<Menu>,
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
