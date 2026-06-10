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
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  foodItemImageFileFilter,
  foodItemImageStorage,
  maxFoodItemImageFileSize,
} from '../config/food-item-image-multer.config';
import { FoodItemsService } from './food-items.service';
import { CreateFoodItemDto } from './dto/create-food-item.dto';
import { UpdateFoodItemDto } from './dto/update-food-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/role.enum';
import { RestaurantsService } from '../restaurants/restaurants.service';

interface RequestWithUser extends Request {
  user: {
    restaurantId: number;
    role: string;
  };
}

@Controller('food-items')
export class FoodItemsController {
  constructor(
    private readonly foodItemsService: FoodItemsService,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  @Post('upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: foodItemImageStorage,
      fileFilter: foodItemImageFileFilter,
      limits: { fileSize: maxFoodItemImageFileSize },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return {
        success: false,
        message: 'No file uploaded',
      };
    }

    const imageUrl = `/uploads/food-items/${file.filename}`;

    return {
      success: true,
      message: 'Food item image uploaded successfully',
      imageUrl,
      filename: file.filename,
      size: file.size,
    };
  }

  @Post('upload-video')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('video', {
      storage: foodItemImageStorage, // reusing same storage folder
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(mp4|webm|avi|mov|mkv)$/i)) {
          return callback(new Error('Only video files are allowed!'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for video
    }),
  )
  uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { success: false, message: 'No video uploaded' };
    }
    const videoUrl = `/uploads/food-items/${file.filename}`;
    return { success: true, videoUrl };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createFoodItemDto: CreateFoodItemDto, @Request() req) {
    const restaurantId = req.user.restaurantId;
    return this.foodItemsService.create(createFoodItemDto, restaurantId);
  }

  @Get()
  async findAll(
    @Query('menuId') menuId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('search') search?: string,
    @Query('restaurantId') restaurantIdQuery?: string,
    @Query('apiKey') apiKeyQuery?: string,
    @Headers('x-api-key') apiKeyHeader?: string,
    @Request() req?: RequestWithUser,
  ) {
    const filters: any = {};

    if (menuId) {
      filters.menuId = parseInt(menuId);
    }

    if (categoryId) {
      filters.categoryId = parseInt(categoryId);
    }

    if (subcategoryId) {
      filters.subcategoryId = parseInt(subcategoryId);
    }

    if (search) {
      filters.search = search;
    }

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

    return this.foodItemsService.findAll(restaurantId, filters);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const restaurantId = req.user.restaurantId;
    return this.foodItemsService.findOne(id, restaurantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFoodItemDto: UpdateFoodItemDto,
    @Request() req,
  ) {
    const restaurantId = req.user.restaurantId;
    return this.foodItemsService.update(id, updateFoodItemDto, restaurantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const restaurantId = req.user.restaurantId;
    return this.foodItemsService.remove(id, restaurantId);
  }
}
