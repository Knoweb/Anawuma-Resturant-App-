import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FoodItem } from './entities/food-item.entity';
import { Category } from '../categories/entities/category.entity';
import { Subcategory } from '../subcategories/entities/subcategory.entity';
import { Menu } from '../menus/entities/menu.entity';
import { CreateFoodItemDto } from './dto/create-food-item.dto';
import { UpdateFoodItemDto } from './dto/update-food-item.dto';

@Injectable()
export class FoodItemsService {
  constructor(
    @InjectRepository(FoodItem)
    private foodItemsRepository: Repository<FoodItem>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    @InjectRepository(Subcategory)
    private subcategoriesRepository: Repository<Subcategory>,
    @InjectRepository(Menu)
    private menusRepository: Repository<Menu>,
  ) { }

  async create(
    createFoodItemDto: CreateFoodItemDto,
    restaurantId: number,
  ): Promise<FoodItem> {
    // Verify menu exists
    const menu = await this.menusRepository.findOne({
      where: {
        menuId: createFoodItemDto.menuId,
        restaurantId,
      },
    });

    if (!menu) {
      throw new NotFoundException(
        `Menu with ID ${createFoodItemDto.menuId} not found`,
      );
    }

    // Verify category exists if provided
    if (createFoodItemDto.categoryId) {
      const category = await this.categoriesRepository.findOne({
        where: {
          categoryId: createFoodItemDto.categoryId,
          menuId: createFoodItemDto.menuId, // Ensure category belongs to the selected menu
          restaurantId,
        },
      });

      if (!category) {
        throw new NotFoundException(
          `Category with ID ${createFoodItemDto.categoryId} not found or does not belong to the selected menu`,
        );
      }

      // If subcategoryId is provided, verify it exists and belongs to the same category
      if (createFoodItemDto.subcategoryId) {
        const subcategory = await this.subcategoriesRepository.findOne({
          where: {
            subcategoryId: createFoodItemDto.subcategoryId,
            categoryId: createFoodItemDto.categoryId,
            restaurantId,
          },
        });

        if (!subcategory) {
          throw new BadRequestException(
            `Subcategory with ID ${createFoodItemDto.subcategoryId} not found or does not belong to category ${createFoodItemDto.categoryId}`,
          );
        }
      }
    }

    const foodItem = this.foodItemsRepository.create({
      ...createFoodItemDto,
      restaurantId,
    });

    const savedItem = await this.foodItemsRepository.save(foodItem);

    // Return with relations
    return await this.findOne(savedItem.foodItemId, restaurantId);
  }

  async findAll(
    restaurantId?: number,
    filters?: {
      menuId?: number;
      categoryId?: number;
      subcategoryId?: number;
      search?: string;
    },
  ): Promise<FoodItem[]> {
    const query = this.foodItemsRepository
      .createQueryBuilder('foodItem')
      .leftJoinAndSelect('foodItem.menu', 'menu')
      .leftJoinAndSelect('foodItem.category', 'category')
      .leftJoinAndSelect('foodItem.subcategory', 'subcategory');

    if (restaurantId) {
      query.andWhere('foodItem.restaurantId = :restaurantId', { restaurantId });
    }

    if (filters?.menuId) {
      query.andWhere('foodItem.menuId = :menuId', { menuId: filters.menuId });
    }

    if (filters?.categoryId) {
      query.andWhere('foodItem.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters?.subcategoryId) {
      query.andWhere('foodItem.subcategoryId = :subcategoryId', {
        subcategoryId: filters.subcategoryId,
      });
    }

    if (filters?.search) {
      query.andWhere('foodItem.itemName LIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    query.orderBy('foodItem.foodItemId', 'DESC');

    const foodItems = await query.getMany();

    // Add API URL prefix to image URLs
    return foodItems.map((item) => this.resolveImageUrls(item));
  }

  private resolveImageUrls(item: FoodItem): FoodItem {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    const fields = ['imageUrl1', 'imageUrl2', 'imageUrl3', 'imageUrl4'] as const;

    // Resolve food item images
    fields.forEach((field) => {
      if (item[field] && !item[field].startsWith('http')) {
        item[field] = `${apiUrl}${item[field]}`;
      }
    });

    // Resolve category image if exists
    if (item.category) {
      if (item.category.imageUrl && !item.category.imageUrl.startsWith('http')) {
        item.category.imageUrl = `${apiUrl}${item.category.imageUrl}`;
      }
    }

    // Resolve menu image if exists
    if (item.menu) {
      if (item.menu.imageUrl && !item.menu.imageUrl.startsWith('http')) {
        item.menu.imageUrl = `${apiUrl}${item.menu.imageUrl}`;
      }
    }

    return item;
  }

  async findOne(id: number, restaurantId: number): Promise<FoodItem> {
    const foodItem = await this.foodItemsRepository.findOne({
      where: { foodItemId: id, restaurantId },
      relations: ['menu', 'category', 'subcategory'],
    });

    if (!foodItem) {
      throw new NotFoundException(`Food item with ID ${id} not found`);
    }

    return this.resolveImageUrls(foodItem);
  }

  async update(
    id: number,
    updateFoodItemDto: UpdateFoodItemDto,
    restaurantId: number,
  ): Promise<FoodItem> {
    const foodItem = await this.findOne(id, restaurantId);

    // If menuId is being updated, verify it exists
    if (updateFoodItemDto.menuId) {
      const menu = await this.menusRepository.findOne({
        where: {
          menuId: updateFoodItemDto.menuId,
          restaurantId,
        },
      });

      if (!menu) {
        throw new NotFoundException(
          `Menu with ID ${updateFoodItemDto.menuId} not found`,
        );
      }
    }

    // If categoryId is being updated, verify it exists and belongs to the current/new menu
    if (updateFoodItemDto.categoryId) {
      const menuId = updateFoodItemDto.menuId || foodItem.menuId;
      const category = await this.categoriesRepository.findOne({
        where: {
          categoryId: updateFoodItemDto.categoryId,
          menuId: menuId,
          restaurantId,
        },
      });

      if (!category) {
        throw new NotFoundException(
          `Category with ID ${updateFoodItemDto.categoryId} not found or does not belong to the selected menu`,
        );
      }
    }

    // If subcategoryId is being updated, verify it exists and belongs to the current/new category
    if (updateFoodItemDto.subcategoryId) {
      const categoryId = updateFoodItemDto.categoryId || foodItem.categoryId;

      if (!categoryId) {
        throw new BadRequestException(
          `A category must be selected to use a subcategory`,
        );
      }

      const subcategory = await this.subcategoriesRepository.findOne({
        where: {
          subcategoryId: updateFoodItemDto.subcategoryId,
          categoryId: categoryId,
          restaurantId,
        },
      });

      if (!subcategory) {
        throw new BadRequestException(
          `Subcategory with ID ${updateFoodItemDto.subcategoryId} not found or does not belong to category ${categoryId}`,
        );
      }
    }

    Object.assign(foodItem, updateFoodItemDto);
    await this.foodItemsRepository.save(foodItem);

    // Return updated item with relations
    return await this.findOne(id, restaurantId);
  }

  async remove(id: number, restaurantId: number): Promise<void> {
    const foodItem = await this.findOne(id, restaurantId);
    await this.foodItemsRepository.remove(foodItem);
  }

  // Super admin can access all food items
  async findAllForSuperAdmin(): Promise<FoodItem[]> {
    const items = await this.foodItemsRepository.find({
      relations: ['menu', 'category', 'subcategory', 'restaurant'],
      order: { foodItemId: 'DESC' },
    });

    return items.map((item) => this.resolveImageUrls(item));
  }
}
