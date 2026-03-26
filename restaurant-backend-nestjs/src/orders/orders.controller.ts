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
  Query,
  Header,
  Headers,
  BadRequestException,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { KitchenDashboardQueryDto } from './dto/kitchen-dashboard-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/role.enum';
import { TableKeyGuard } from '../common/guards/table-key.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(TableKeyGuard) // Secure public endpoint with QR key (Table or Room)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per 60 seconds
  create(@Req() req, @Body() createOrderDto: CreateOrderDto) {
    // restaurantId, tableNo/roomNo, and orderType come from TableKeyGuard (attached to req)
    const { restaurantId, tableNo, roomNo, orderType } = req;
    
    // Validate items array is not empty
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Override tableNo/roomNo/orderType from the guard (more secure than client input)
    const orderData = { 
      ...createOrderDto, 
      tableNo, 
      roomNo, 
      orderType 
    };

    return this.ordersService.create(orderData, restaurantId);
  }

  @Post('manual')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CASHIER)
  createManual(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    const restaurantId = req.user.restaurantId;
    
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Manual orders must specify tableNo or roomNo
    if (!createOrderDto.tableNo && !createOrderDto.roomNo) {
      throw new BadRequestException('Table or Room number is required for manual orders');
    }

    // For manual orders from cashier dashboard, we use a distinct orderType if provided, 
    // or default to MANUAL_CASHIER
    const orderData = { 
      ...createOrderDto, 
      orderType: createOrderDto.orderType || 'MANUAL_CASHIER' as any
    };

    return this.ordersService.create(orderData, restaurantId);
  }

  @Get()
  @SkipThrottle() // Skip rate limiting for authenticated GET requests
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.KITCHEN, UserRole.HOUSEKEEPER)
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  findAll(@Query() queryDto: QueryOrdersDto, @Request() req) {
    const restaurantId = req.user.restaurantId;
    return this.ordersService.findAll(restaurantId, queryDto);
  }

  @Get(':id')
  @SkipThrottle() // Skip rate limiting for authenticated requests
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.KITCHEN, UserRole.HOUSEKEEPER)
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const restaurantId = req.user.restaurantId;
    return this.ordersService.findOne(id, restaurantId);
  }

  @Get('kitchen/dashboard-summary')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.KITCHEN)
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  getKitchenDashboardSummary(
    @Query() queryDto: KitchenDashboardQueryDto,
    @Request() req,
  ) {
    const restaurantId = req.user.restaurantId;
    return this.ordersService.getKitchenDashboardSummary(restaurantId, queryDto);
  }

  // Public endpoint for customers to track their order
  @Get('track/:id')
  @SkipThrottle()
  async trackOrder(
    @Param('id', ParseIntPipe) id: number, 
    @Headers('x-table-key') tableKey: string,
    @Headers('x-room-key') roomKey: string
  ) {
    if (!tableKey && !roomKey) {
      throw new HttpException('QR key is required', HttpStatus.UNAUTHORIZED);
    }
    
    // Verify QR key and get order
    const order = await this.ordersService.trackOrderByQrKey(id, tableKey, roomKey);
    if (!order) {
      throw new HttpException('Order not found or unauthorized', HttpStatus.NOT_FOUND);
    }
    
    return order;
  }

  @Patch(':id/status')
  @SkipThrottle() // Skip rate limiting for authenticated requests
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.KITCHEN, UserRole.HOUSEKEEPER)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @Request() req,
  ) {
    const restaurantId = req.user.restaurantId;
    return this.ordersService.updateStatus(id, updateOrderStatusDto, restaurantId);
  }

  @Delete(':id')
  @SkipThrottle() // Skip rate limiting for authenticated requests
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const restaurantId = req.user.restaurantId;
    return this.ordersService.remove(id, restaurantId);
  }
}
