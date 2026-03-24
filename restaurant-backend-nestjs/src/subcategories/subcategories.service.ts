import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subcategory } from './entities/subcategory.entity';
import { Category } from '../categories/entities/category.entity';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';

@Injectable()
export class SubcategoriesService {
  constructor(
    @InjectRepository(Subcategory)
    private subcategoriesRepository: Repository<Subcategory>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async create(
    createSubcategoryDto: CreateSubcategoryDto,
    restaurantId: number,
  ): Promise<Subcategory> {
    // Verify category exists
    const category = await this.categoriesRepository.findOne({
      where: { 
        categoryId: createSubcategoryDto.categoryId,
        restaurantId 
      },
    });

    if (!category) {
      throw new NotFoundException(
        `Category with ID ${createSubcategoryDto.categoryId} not found`,
      );
    }

    const subcategory = this.subcategoriesRepository.create({
      ...createSubcategoryDto,
      restaurantId,
    });

    return await this.subcategoriesRepository.save(subcategory);
  }

  async findAll(restaurantId?: number, categoryId?: number): Promise<Subcategory[]> {
    const where: any = {};
    
    if (restaurantId) {
      where.restaurantId = restaurantId;
    }
    
    if (categoryId) {
      where.categoryId = categoryId;
    }

    return await this.subcategoriesRepository.find({
      where,
      relations: ['category'],
      order: { subcategoryId: 'DESC' },
    });
  }

  async findByCategory(
    categoryId: number,
    restaurantId: number,
  ): Promise<Subcategory[]> {
    return await this.subcategoriesRepository.find({
      where: { categoryId, restaurantId },
      order: { subcategoryId: 'DESC' },
    });
  }

  async findOne(id: number, restaurantId: number): Promise<Subcategory> {
    const subcategory = await this.subcategoriesRepository.findOne({
      where: { subcategoryId: id, restaurantId },
      relations: ['category'],
    });

    if (!subcategory) {
      throw new NotFoundException(`Subcategory with ID ${id} not found`);
    }

    return subcategory;
  }

  async update(
    id: number,
    updateSubcategoryDto: UpdateSubcategoryDto,
    restaurantId: number,
  ): Promise<Subcategory> {
    const subcategory = await this.findOne(id, restaurantId);

    // If categoryId is being updated, verify the new category exists
    if (updateSubcategoryDto.categoryId) {
      const category = await this.categoriesRepository.findOne({
        where: { 
          categoryId: updateSubcategoryDto.categoryId,
          restaurantId 
        },
      });

      if (!category) {
        throw new NotFoundException(
          `Category with ID ${updateSubcategoryDto.categoryId} not found`,
        );
      }
    }

    Object.assign(subcategory, updateSubcategoryDto);
    return await this.subcategoriesRepository.save(subcategory);
  }

  async remove(id: number, restaurantId: number): Promise<void> {
    const subcategory = await this.subcategoriesRepository.findOne({
      where: { subcategoryId: id, restaurantId },
      relations: ['foodItems'],
    });

    if (!subcategory) {
      throw new NotFoundException(`Subcategory with ID ${id} not found`);
    }

    await this.subcategoriesRepository.remove(subcategory);
  }

  // For super admin - no restaurant isolation
  async findAllForSuperAdmin(): Promise<Subcategory[]> {
    return await this.subcategoriesRepository.find({
      relations: ['category', 'restaurant'],
      order: { subcategoryId: 'DESC' },
    });
  }
}
