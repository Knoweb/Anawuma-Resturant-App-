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
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/role.enum';
import {
  offerImageStorage,
  imageFileFilter,
  maxFileSize,
} from '../config/multer.config';

@Controller('offers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  create(@Body() createOfferDto: CreateOfferDto, @Request() req) {
    const restaurantId = req.user.restaurantId;
    return this.offersService.create(createOfferDto, restaurantId);
  }

  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: offerImageStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: maxFileSize },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    // Return the URL where the file can be accessed
    const imageUrl = `/uploads/offers/${file.filename}`;
    return {
      message: 'File uploaded successfully',
      imageUrl,
      filename: file.filename,
      size: file.size,
    };
  }

  @Get()
  findAll(@Request() req) {
    const restaurantId = req.user.restaurantId;
    return this.offersService.findAll(restaurantId);
  }

  @Get('active')
  findActiveOffers(@Request() req) {
    const restaurantId = req.user.restaurantId;
    return this.offersService.findActiveOffers(restaurantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const restaurantId = req.user.restaurantId;
    return this.offersService.findOne(id, restaurantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOfferDto: UpdateOfferDto,
    @Request() req,
  ) {
    const restaurantId = req.user.restaurantId;
    return this.offersService.update(id, updateOfferDto, restaurantId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const restaurantId = req.user.restaurantId;
    return this.offersService.remove(id, restaurantId);
  }
}
