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

    // Total orders count
    const totalOrders = await totalOrdersQuery.getCount();

    // Today's orders
    const todayOrders = await todayOrdersQuery
      .andWhere('order.createdAt >= :today', { today })
      .getCount();

    // Total revenue (only completed orders)
    const revenueResult: { total: string } | undefined = await revenueQuery
      .select('SUM(order.totalAmount)', 'total')
      .andWhere('order.status = :status', { status: OrderStatus.SERVED })
      .getRawOne();
    const totalRevenue = parseFloat(revenueResult?.total || '0');

    // Active menus count (all menus for the restaurant)
    const activeMenus = await menusQuery.getCount();

    // Pending orders (NEW, ACCEPTED, COOKING, READY)
    const pendingOrders = await pendingQuery
      .andWhere('order.status IN (:...statuses)', {
        statuses: [
          OrderStatus.NEW,
          OrderStatus.ACCEPTED,
          OrderStatus.COOKING,
          OrderStatus.READY,
        ],
      })
      .getCount();

    // Completed orders (today)
    const completedOrders = await completedQuery
      .andWhere('order.status = :status', { status: OrderStatus.SERVED })
      .andWhere('order.createdAt >= :today', { today })
      .getCount();

    // Recent orders (last 10)
    const recentOrders = await recentOrdersQuery
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .orderBy('order.createdAt', 'DESC')
      .take(10)
      .getMany();

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
        itemCount: order.orderItems?.length || 0,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
      })),
    };
  }
}
