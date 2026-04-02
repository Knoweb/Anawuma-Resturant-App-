import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, OrderType } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { FoodItem } from '../food-items/entities/food-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { KitchenDashboardQueryDto } from './dto/kitchen-dashboard-query.dto';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { TableQrService } from '../table-qr/table-qr.service';
import { RoomQrService } from '../room-qr/room-qr.service';
import {
  isLikelyWhatsAppNumber,
  normalizeWhatsAppNumber,
} from '../common/utils/phone.utils';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(FoodItem)
    private foodItemsRepository: Repository<FoodItem>,
    private websocketGateway: WebsocketGateway,
    private tableQrService: TableQrService,
    private roomQrService: RoomQrService,
  ) { }

  async create(createOrderDto: CreateOrderDto, restaurantId: number) {
    const { tableNo, roomNo, orderType, customerName, whatsappNumber, notes, items } = createOrderDto;

    // Normalize WhatsApp number if provided
    const normalizedWhatsapp = whatsappNumber
      ? normalizeWhatsAppNumber(whatsappNumber)
      : undefined;

    if (whatsappNumber && !isLikelyWhatsAppNumber(normalizedWhatsapp || '')) {
      throw new BadRequestException(
        'Please enter a valid WhatsApp number with country code',
      );
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Fetch all food items in one query
    const foodItemIds = items.map((item) => item.foodItemId);
    const foodItems = await this.foodItemsRepository.findByIds(foodItemIds);

    if (foodItems.length !== foodItemIds.length) {
      throw new NotFoundException('One or more food items not found');
    }

    // Create a map for quick lookup
    const foodItemMap = new Map(
      foodItems.map((item) => [item.foodItemId, item]),
    );

    // Calculate totals and prepare order items
    let subtotal = 0;
    const orderItems: Partial<OrderItem>[] = [];

    for (const item of items) {
      const foodItem = foodItemMap.get(item.foodItemId);
      if (!foodItem) {
        throw new NotFoundException(
          `Food item with ID ${item.foodItemId} not found`,
        );
      }

      const unitPrice = parseFloat(foodItem.price.toString());
      const lineTotal = unitPrice * item.qty;
      subtotal += lineTotal;

      orderItems.push({
        foodItemId: item.foodItemId,
        itemName: foodItem.itemName,
        unitPrice: unitPrice,
        qty: item.qty,
        lineTotal: lineTotal,
        notes: item.notes,
      });
    }

    // Calculate service charge (10%)
    const serviceCharge = subtotal * 0.1;
    const totalAmount = subtotal + serviceCharge;

    // Generate order number (simple timestamp-based for MVP)
    const orderNo = `ORD-${Date.now()}`;

    // Create order with cascade
    const order = this.ordersRepository.create({
      orderNo,
      tableNo,
      roomNo,
      orderType: orderType || (roomNo ? OrderType.ROOM : OrderType.TABLE),
      customerName,
      whatsappNumber: normalizedWhatsapp,
      notes,
      subtotal,
      serviceCharge,
      totalAmount,
      restaurantId,
      status: orderType === OrderType.MANUAL_CASHIER ? OrderStatus.SERVED : OrderStatus.NEW,
      orderItems: orderItems as OrderItem[],
    });

    const savedOrder = await this.ordersRepository.save(order);

    console.log('🔔 ORDER CREATED - Preparing to emit WebSocket event');
    console.log('Order ID:', savedOrder.orderId);
    console.log('Order No:', savedOrder.orderNo);
    console.log('Type:', savedOrder.orderType);
    console.log('Restaurant ID:', savedOrder.restaurantId);

    // Emit real-time notification for new order
    this.websocketGateway.emitNewOrder({
      orderId: savedOrder.orderId,
      orderNo: savedOrder.orderNo,
      tableNo: savedOrder.tableNo,
      roomNo: savedOrder.roomNo,
      orderType: savedOrder.orderType,
      totalAmount: savedOrder.totalAmount,
      itemCount: savedOrder.orderItems.length,
      status: savedOrder.status,
      restaurantId: savedOrder.restaurantId,
    });

    // Emit dashboard update
    this.websocketGateway.server.emit('dashboard:refresh');
    console.log('✅ WebSocket events emitted for order:', savedOrder.orderNo);

    return savedOrder;
  }

  async findAll(restaurantId: number, queryDto: QueryOrdersDto = {}) {
    const { status, from, to, tableNo, roomNo, orderType, orderNo } = queryDto;

    const query = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .leftJoinAndSelect('orderItems.foodItem', 'foodItem')
      .where('order.restaurantId = :restaurantId', { restaurantId })
      .orderBy('order.createdAt', 'DESC'); // Latest first

    // Status filter
    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    // Date range filter
    if (from || to) {
      const startDate = from
        ? new Date(`${from}T00:00:00.000Z`)
        : new Date('1970-01-01');
      const endDate = to
        ? new Date(`${to}T23:59:59.999Z`)
        : new Date('2099-12-31');

      query.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    // Table number partial match
    if (tableNo) {
      query.andWhere('order.tableNo LIKE :tableNo', {
        tableNo: `%${tableNo}%`,
      });
    }

    // Room number partial match
    if (roomNo) {
      query.andWhere('order.roomNo LIKE :roomNo', {
        roomNo: `%${roomNo}%`,
      });
    }

    // Order type filter
    if (orderType) {
      query.andWhere('order.orderType = :orderType', { orderType });
    }

    // Order number partial match
    if (orderNo) {
      query.andWhere('order.orderNo LIKE :orderNo', {
        orderNo: `%${orderNo}%`,
      });
    }

    return await query.getMany();
  }

  async findOne(id: number, restaurantId?: number) {
    const query = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .leftJoinAndSelect('orderItems.foodItem', 'foodItem')
      .where('order.orderId = :id', { id });

    if (restaurantId) {
      query.andWhere('order.restaurantId = :restaurantId', { restaurantId });
    }

    const order = await query.getOne();

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async getKitchenDashboardSummary(
    restaurantId: number,
    queryDto: KitchenDashboardQueryDto = {},
  ) {
    const limit = queryDto.limit ?? 8;
    const urgentThresholdMinutes = queryDto.urgentThresholdMinutes ?? 15;

    const activeStatuses: OrderStatus[] = [
      OrderStatus.NEW,
      OrderStatus.ACCEPTED,
      OrderStatus.COOKING,
      OrderStatus.READY,
    ];

    const statusCountsRaw = await this.ordersRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.restaurantId = :restaurantId', { restaurantId })
      .andWhere('order.status IN (:...activeStatuses)', { activeStatuses })
      .groupBy('order.status')
      .getRawMany();

    const statusCounts = {
      NEW: 0,
      ACCEPTED: 0,
      COOKING: 0,
      READY: 0,
    };

    for (const row of statusCountsRaw) {
      const status = row.status as keyof typeof statusCounts;
      if (status in statusCounts) {
        statusCounts[status] = Number(row.count) || 0;
      }
    }

    const urgentBefore = new Date(
      Date.now() - urgentThresholdMinutes * 60 * 1000,
    );

    const urgentCount = await this.ordersRepository
      .createQueryBuilder('order')
      .where('order.restaurantId = :restaurantId', { restaurantId })
      .andWhere('order.status IN (:...urgentStatuses)', {
        urgentStatuses: [OrderStatus.NEW, OrderStatus.ACCEPTED],
      })
      .andWhere('order.createdAt <= :urgentBefore', { urgentBefore })
      .getCount();

    const queue = await this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .where('order.restaurantId = :restaurantId', { restaurantId })
      .andWhere('order.status IN (:...activeStatuses)', { activeStatuses })
      .orderBy('order.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return {
      summary: {
        newCount: statusCounts.NEW,
        acceptedCount: statusCounts.ACCEPTED,
        cookingCount: statusCounts.COOKING,
        readyCount: statusCounts.READY,
        totalOpen:
          statusCounts.NEW +
          statusCounts.ACCEPTED +
          statusCounts.COOKING +
          statusCounts.READY,
        urgentCount,
      },
      queue,
      meta: {
        limit,
        urgentThresholdMinutes,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  async updateStatus(
    id: number,
    updateOrderStatusDto: UpdateOrderStatusDto,
    restaurantId?: number,
  ) {
    const order = await this.findOne(id, restaurantId);

    order.status = updateOrderStatusDto.status;
    const updatedOrder = await this.ordersRepository.save(order);

    // Emit real-time notification for order status update
    this.websocketGateway.emitOrderStatusUpdate({
      orderId: updatedOrder.orderId,
      orderNo: updatedOrder.orderNo,
      tableNo: updatedOrder.tableNo,
      status: updatedOrder.status,
      restaurantId: updatedOrder.restaurantId,
    });

    // Emit dashboard update
    this.websocketGateway.server.emit('dashboard:refresh');

    return updatedOrder;
  }

  async remove(id: number, restaurantId?: number) {
    const order = await this.findOne(id, restaurantId);
    await this.ordersRepository.remove(order);
    return { message: 'Order deleted successfully' };
  }

  // Track order by QR key (for customers/guests)
  async trackOrderByQrKey(orderId: number, tableKey?: string, roomKey?: string) {
    let restaurantId: number;
    let tableNo: string | null = null;
    let roomNo: string | null = null;

    if (tableKey) {
      const tableQr = await this.tableQrService.findByTableKey(tableKey);
      if (!tableQr) return null;
      restaurantId = tableQr.restaurantId;
      tableNo = tableQr.tableNo;
    } else if (roomKey) {
      const roomQr = await this.roomQrService.findByRoomKey(roomKey);
      if (!roomQr) return null;
      restaurantId = roomQr.restaurantId;
      roomNo = roomQr.roomNo;
    } else {
      return null;
    }

    // Get order and verify it belongs to this table/room and restaurant
    const query = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .where('order.orderId = :orderId', { orderId })
      .andWhere('order.restaurantId = :restaurantId', { restaurantId });

    if (tableKey) {
      query.andWhere('order.tableNo = :tableNo', { tableNo });
    } else {
      query.andWhere('order.roomNo = :roomNo', { roomNo });
    }

    return await query.getOne();
  }

  async getManualActiveAccounts(restaurantId: number, type: 'ROOM' | 'TABLE') {
    const activeStatuses: OrderStatus[] = [
      OrderStatus.NEW,
      OrderStatus.ACCEPTED,
      OrderStatus.COOKING,
      OrderStatus.READY,
      OrderStatus.SERVED,
    ];

    const query = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .where('order.restaurantId = :restaurantId', { restaurantId })
      .andWhere('order.orderType = :orderType', { orderType: OrderType.MANUAL_CASHIER })
      .andWhere('order.status IN (:...activeStatuses)', { activeStatuses });

    if (type === 'ROOM') {
      query.andWhere('order.roomNo IS NOT NULL');
    } else {
      query.andWhere('order.tableNo IS NOT NULL');
    }

    const orders = await query.getMany();

    // Aggregate by roomNo or tableNo
    const accounts: Record<string, any> = {};

    orders.forEach(order => {
      const key = type === 'ROOM' ? order.roomNo : order.tableNo;
      if (!key) return;

      if (!accounts[key]) {
        accounts[key] = {
          identifier: key,
          orders: [],
          totalAmount: 0,
          itemCount: 0,
          lastOrderAt: order.createdAt
        };
      }

      accounts[key].orders.push(order);
      accounts[key].totalAmount += parseFloat(order.totalAmount.toString());
      accounts[key].itemCount += order.orderItems ? order.orderItems.length : 0;

      if (new Date(order.createdAt) > new Date(accounts[key].lastOrderAt)) {
        accounts[key].lastOrderAt = order.createdAt;
      }
    });

    return Object.values(accounts);
  }
}
