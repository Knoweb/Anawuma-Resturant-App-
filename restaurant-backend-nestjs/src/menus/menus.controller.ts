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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  menuImageFileFilter,
  menuImageStorage,
  maxMenuImageFileSize,
} from '../config/menu-image-multer.config';
import { MenusService } from './menus.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/role.enum';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    restaurantId?: number;
    role?: string;
  };
}

@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) { }

  @Post('upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: menuImageStorage,
      fileFilter: menuImageFileFilter,
      limits: { fileSize: maxMenuImageFileSize },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return {
        success: false,
        message: 'No file uploaded',
      };
    }

    const imageUrl = `/uploads/menus/${file.filename}`;

    return {
      success: true,
      message: 'Menu image uploaded successfully',
      imageUrl,
      filename: file.filename,
      size: file.size,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createMenuDto: CreateMenuDto, @Request() req: RequestWithUser) {
    const restaurantId = req.user.role === UserRole.SUPER_ADMIN
      ? (createMenuDto as any).restaurantId
      : req.user.restaurantId;

    return this.menusService.create(createMenuDto, restaurantId || 0);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll(@Request() req: any) {
    if (req.user.role === UserRole.SUPER_ADMIN) {
      return this.menusService.findAllForSuperAdmin();
    }
    return this.menusService.findAll(req.user.restaurantId || 0);
  }

  @Get('all') // Added for backward compatibility if needed by frontend
  @UseGuards(OptionalJwtAuthGuard)
  findAllPublic(@Query('restaurantId') restaurantIdQuery?: string, @Request() req?: any) {
    const restaurantId = req?.user?.restaurantId || +(restaurantIdQuery || 0);
    return this.menusService.findAll(restaurantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    const restaurantId = req.user.role === UserRole.SUPER_ADMIN ? undefined : (req.user.restaurantId || 0);
    return this.menusService.findOne(+id, restaurantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateMenuDto: UpdateMenuDto,
    @Request() req: RequestWithUser,
  ) {
    const restaurantId = req.user.role === UserRole.SUPER_ADMIN ? undefined : (req.user.restaurantId || 0);
    return this.menusService.update(
      +id,
      updateMenuDto,
      restaurantId,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    const restaurantId = req.user.role === UserRole.SUPER_ADMIN ? undefined : (req.user.restaurantId || 0);
    return this.menusService.remove(+id, restaurantId);
  }
}
