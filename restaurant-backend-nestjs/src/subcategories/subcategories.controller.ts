import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { SubcategoriesService } from './subcategories.service';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/role.enum';

@Controller('subcategories')
export class SubcategoriesController {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() createSubcategoryDto: CreateSubcategoryDto, @Request() req) {
    const restaurantId =
      req.user.role === 'super_admin' ? null : req.user.restaurantId;
    return this.subcategoriesService.create(createSubcategoryDto, restaurantId);
  }

  @Get()
  findAll(@Query('categoryId') categoryId?: string) {
    // Public endpoint - returns all subcategories or filtered by categoryId
    const categoryIdNum = categoryId ? parseInt(categoryId, 10) : undefined;
    return this.subcategoriesService.findAll(undefined, categoryIdNum);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const restaurantId =
      req.user.role === 'super_admin' ? null : req.user.restaurantId;
    return this.subcategoriesService.findOne(+id, restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSubcategoryDto: UpdateSubcategoryDto,
    @Request() req,
  ) {
    const restaurantId =
      req.user.role === 'super_admin' ? null : req.user.restaurantId;
    return this.subcategoriesService.update(+id, updateSubcategoryDto, restaurantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const restaurantId =
      req.user.role === 'super_admin' ? null : req.user.restaurantId;
    return this.subcategoriesService.remove(+id, restaurantId);
  }
}
