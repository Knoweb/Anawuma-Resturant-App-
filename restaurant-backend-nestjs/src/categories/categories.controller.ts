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
  UseInterceptors,
  UploadedFile,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  categoryImageFileFilter,
  categoryImageStorage,
  maxCategoryImageFileSize,
} from '../config/category-image-multer.config';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/role.enum';
import { RestaurantsService } from '../restaurants/restaurants.service';

interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    restaurantId?: number;
    isSuperAdmin?: boolean;
  };
}

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  @Post('upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: categoryImageStorage,
      fileFilter: categoryImageFileFilter,
      limits: { fileSize: maxCategoryImageFileSize },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return {
        success: false,
        message: 'No file uploaded',
      };
    }

    const imageUrl = `/uploads/categories/${file.filename}`;

    return {
      success: true,
      message: 'Category image uploaded successfully',
      imageUrl,
      filename: file.filename,
      size: file.size,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @Request() req: RequestWithUser,
  ) {
    const restaurantId = req.user.isSuperAdmin
      ? (createCategoryDto as any).restaurantId || req.user.restaurantId
      : req.user.restaurantId;

    return this.categoriesService.create(createCategoryDto, restaurantId || 0);
  }

  @Get()
  async findAll(
    @Query('menuId') menuId?: string,
    @Query('restaurantId') restaurantIdQuery?: string,
    @Query('apiKey') apiKeyQuery?: string,
    @Headers('x-api-key') apiKeyHeader?: string,
    @Request() req?: RequestWithUser,
  ) {
    // Resolve restaurantId: prefer authenticated user, then query param, then API key
    let restaurantId: number | undefined = req?.user?.restaurantId;

    if (!restaurantId && restaurantIdQuery) {
      restaurantId = parseInt(restaurantIdQuery, 10);
    }

    if (!restaurantId) {
      const apiKey = apiKeyHeader || apiKeyQuery;
      if (apiKey) {
        const restaurant = await this.restaurantsService.findByApiKey(apiKey);
        if (restaurant) {
          restaurantId = restaurant.restaurantId;
        }
      }
    }

    // If menuId is provided, filter by menu
    if (menuId) {
      return this.categoriesService.findByMenu(+menuId, restaurantId);
    }

    return this.categoriesService.findAll(restaurantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.categoriesService.findOne(+id, req.user.restaurantId || 0);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Request() req: RequestWithUser,
  ) {
    const restaurantId = req.user.isSuperAdmin ? undefined : (req.user.restaurantId || 0);
    return this.categoriesService.update(
      +id,
      updateCategoryDto,
      restaurantId,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.categoriesService.remove(+id, req.user.restaurantId || 0);
    return { message: 'Category deleted successfully' };
  }
}
