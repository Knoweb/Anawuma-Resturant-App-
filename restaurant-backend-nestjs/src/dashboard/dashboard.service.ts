import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Menu } from '../menus/entities/menu.entity';

export interface DashboardStats {
  totalOrders: number;
  todayOrders: number;
  totalRevenue: number;
  activeMenus: number;
  pendingOrders: number;
  completedOrders: number;
  recentOrders: any[];
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
  ) {}

  async getStats(restaurantId?: number): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build base query
    let totalOrdersQuery = this.orderRepository.createQueryBuilder('order');
    let todayOrdersQuery = this.orderRepository.createQueryBuilder('order');
    let revenueQuery = this.orderRepository.createQueryBuilder('order');
    let pendingQuery = this.orderRepository.createQueryBuilder('order');
    let completedQuery = this.orderRepository.createQueryBuilder('order');
    let recentOrdersQuery = this.orderRepository.createQueryBuilder('order');
    let menusQuery = this.menuRepository.createQueryBuilder('menu');

    // Apply restaurant filter if provided
    if (restaurantId) {
      totalOrdersQuery = totalOrdersQuery.where(
        'order.restaurantId = :restaurantId',
        { restaurantId },
      );
      todayOrdersQuery = todayOrdersQuery.where(
        'order.restaurantId = :restaurantId',
        { restaurantId },
      );
      revenueQuery = revenueQuery.where(
        'order.restaurantId = :restaurantId',
        { restaurantId },
      );
      pendingQuery = pendingQuery.where(
        'order.restaurantId = :restaurantId',
        { restaurantId },
      );
      completedQuery = completedQuery.where(
        'order.restaurantId = :restaurantId',
        { restaurantId },
      );
      recentOrdersQuery = recentOrdersQuery.where(
        'order.restaurantId = :restaurantId',
        { restaurantId },
      );
      menusQuery = menusQuery.where('menu.restaurantId = :restaurantId', {
        restaurantId,
      });
    }

    // Execute all queries in parallel for better performance (Promise.all)
    const [
      totalOrders,
      todayOrders,
      revenueResult,
      activeMenus,
      pendingOrders,
      completedOrders,
      recentOrders,
    ] = await Promise.all([
      totalOrdersQuery.getCount(),
      
      todayOrdersQuery
        .andWhere('order.createdAt >= :today', { today })
        .getCount(),
        
      revenueQuery
        .select('SUM(order.totalAmount)', 'total')
        .andWhere('order.status = :status', { status: OrderStatus.SERVED })
        .getRawOne() as Promise<{ total: string } | undefined>,
        
      menusQuery.getCount(),
      
      pendingQuery
        .andWhere('order.status IN (:...statuses)', {
          statuses: [
            OrderStatus.NEW,
            OrderStatus.ACCEPTED,
            OrderStatus.COOKING,
            OrderStatus.READY,
          ],
        })
        .getCount(),
        
      completedQuery
        .andWhere('order.status = :status', { status: OrderStatus.SERVED })
        .andWhere('order.createdAt >= :today', { today })
        .getCount(),
        
      recentOrdersQuery
        .leftJoinAndSelect('order.orderItems', 'orderItems')
        .orderBy('order.createdAt', 'DESC')
        .take(10)
        .getMany(),
    ]);

    const totalRevenue = parseFloat(revenueResult?.total || '0');

    return {
      totalOrders,
      todayOrders,
      totalRevenue,
      activeMenus,
      pendingOrders,
      completedOrders,
      recentOrders: recentOrders.map((order) => ({
        orderId: order.orderId,
        orderNo: order.orderNo,
        tableNo: order.tableNo,
        roomNo: order.roomNo,
        orderType: order.orderType,
        itemCount: order.orderItems?.length || 0,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
      })),
    };
  }
}
