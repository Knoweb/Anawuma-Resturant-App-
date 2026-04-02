import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Invoice,
  InvoiceStatus,
  AccountantTransferStatus,
} from './entities/invoice.entity';
import { BillAction, BillActionType } from './entities/bill-action.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import {
  RecordBillActionDto,
  BillActionHistoryDto,
} from './dto/record-bill-action.dto';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Invoice)
    private invoicesRepository: Repository<Invoice>,
    @InjectRepository(BillAction)
    private billActionsRepository: Repository<BillAction>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    private websocketGateway: WebsocketGateway,
  ) { }

  private buildInvoiceSnapshot(
    order: Order,
    adminId?: number,
    overrides: Partial<Invoice> = {},
  ): Invoice {
    const subtotal = order.subtotal && parseFloat(order.subtotal.toString()) > 0
      ? parseFloat(order.subtotal.toString())
      : parseFloat(order.totalAmount.toString());

    // Default service charge from order, or 0 if legacy
    const serviceCharge = order.serviceCharge ? parseFloat(order.serviceCharge.toString()) : 0;
    const finalTotal = parseFloat(order.totalAmount.toString());

    const today = new Date();
    const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const invoiceNumber = `INV-${datePart}-${order.orderId}`;

    const orderItemsSnapshot = (order.orderItems || []).map((item) => ({
      itemName: item.itemName,
      qty: item.qty,
      unitPrice: parseFloat(item.unitPrice.toString()),
      lineTotal: parseFloat(item.lineTotal.toString()),
      notes: item.notes || null,
    }));

    return this.invoicesRepository.create({
      invoiceNumber,
      orderId: order.orderId,
      restaurantId: order.restaurantId,
      customerName: order.customerName,
      whatsappNumber: order.whatsappNumber,
      tableNo: order.tableNo,
      orderItemsJson: orderItemsSnapshot,
      subtotal,
      taxAmount: 0,
      serviceCharge,
      discountAmount: 0,
      totalAmount: finalTotal,
      invoiceStatus: InvoiceStatus.PENDING,
      isPrinted: false,
      isSentToCashier: false,
      isSentWhatsapp: false,
      sentToCashierAt: null,
      accountantTransferStatus: AccountantTransferStatus.NONE,
      sentToAccountantAt: null,
      sentToAccountantByAdminId: null,
      acceptedByAccountantAt: null,
      acceptedByAccountantId: null,
      createdByAdminId: adminId ?? null,
      ...overrides,
    });
  }

  private async hydrateOrderNo(invoice: Invoice): Promise<Invoice> {
    if (!invoice?.orderId) {
      return invoice;
    }

    const row = await this.ordersRepository
      .createQueryBuilder('order')
      .select('order.orderNo', 'orderNo')
      .where('order.orderId = :orderId', { orderId: invoice.orderId })
      .andWhere('order.restaurantId = :restaurantId', {
        restaurantId: invoice.restaurantId,
      })
      .getRawOne<{ orderNo?: string }>();

    invoice.orderNo = row?.orderNo || undefined;
    return invoice;
  }

  private async hydrateOrderNos(invoices: Invoice[]): Promise<Invoice[]> {
    if (!Array.isArray(invoices) || invoices.length === 0) {
      return invoices;
    }

    const orderIds = [
      ...new Set(invoices.map((invoice) => invoice.orderId).filter(Boolean)),
    ];
    if (orderIds.length === 0) {
      return invoices;
    }

    const rows = await this.ordersRepository
      .createQueryBuilder('order')
      .select('order.orderId', 'orderId')
      .addSelect('order.orderNo', 'orderNo')
      .where('order.orderId IN (:...orderIds)', { orderIds })
      .getRawMany<{ orderId: string | number; orderNo?: string }>();

    const orderNoById = new Map<number, string>();
    rows.forEach((row) => {
      const id = Number(row.orderId);
      if (Number.isFinite(id) && row.orderNo) {
        orderNoById.set(id, row.orderNo);
      }
    });

    invoices.forEach((invoice) => {
      if (invoice.orderId) {
        invoice.orderNo = orderNoById.get(invoice.orderId);
      }
    });

    return invoices;
  }

  /**
   * Finalizes multiple manual orders into a single PAID invoice
   * and sends it to Accountant Transfer.
   */
  async finalizeManualCheckout(
    restaurantId: number,
    adminId: number,
    payload: {
      orderIds: number[];
      identifier: string;
      type: 'ROOM' | 'TABLE';
    },
  ): Promise<Invoice> {
    // 1. Load orders with items
    const orders = await this.ordersRepository.find({
      where: {
        orderId: In(payload.orderIds),
        restaurantId,
      },
      relations: ['orderItems'],
    });

    if (orders.length === 0) {
      throw new BadRequestException('No orders found to finalize');
    }

    // 2. Aggregate financials and items
    let subtotal = 0;
    let serviceCharge = 0;
    let totalAmount = 0;
    const aggregatedItems: any[] = [];

    orders.forEach((order) => {
      const orderSubtotal =
        order.subtotal && parseFloat(order.subtotal.toString()) > 0
          ? parseFloat(order.subtotal.toString())
          : parseFloat(order.totalAmount.toString());

      const orderSC = order.serviceCharge
        ? parseFloat(order.serviceCharge.toString())
        : 0;

      subtotal += orderSubtotal;
      serviceCharge += orderSC;
      totalAmount += parseFloat(order.totalAmount.toString());

      (order.orderItems || []).forEach((item) => {
        aggregatedItems.push({
          itemName: item.itemName,
          qty: item.qty,
          unitPrice: parseFloat(item.unitPrice.toString()),
          lineTotal: parseFloat(item.lineTotal.toString()),
          notes: item.notes || null,
        });
      });
    });

    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      '0',
    )}${String(now.getDate()).padStart(2, '0')}`;
    const timePart = `${String(now.getHours()).padStart(2, '0')}${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;
    const randomPart = Math.floor(Math.random() * 900) + 100;
    const invoiceNumber = `INV-MAN-${datePart}-${timePart}-${randomPart}`;

    // 3. Create Aggregated Invoice
    const invoice = this.invoicesRepository.create({
      invoiceNumber,
      orderId: orders[0].orderId, // Refer to the first order
      restaurantId,
      tableNo: payload.identifier,
      customerName: `Manual Order (${payload.type} ${payload.identifier})`,
      orderItemsJson: aggregatedItems,
      subtotal,
      taxAmount: 0,
      serviceCharge,
      discountAmount: 0,
      totalAmount,
      invoiceStatus: InvoiceStatus.PAID,
      isPrinted: true,
      accountantTransferStatus: AccountantTransferStatus.PENDING,
      sentToAccountantAt: now,
      sentToAccountantByAdminId: adminId,
      createdByAdminId: adminId,
    });

    const savedInvoice = await this.invoicesRepository.save(invoice);
    savedInvoice.orderNo = orders[0].orderNo || undefined;

    // 4. Update all orders to BILLED status
    for (const order of orders) {
      order.status = OrderStatus.BILLED;
      await this.ordersRepository.save(order);
    }

    // 5. Notify frontend
    this.websocketGateway.server.emit('dashboard:refresh');

    return savedInvoice;
  }

  private resolveDateBounds(date?: string): {
    dateLabel: string;
    startDate: Date;
    endDate: Date;
  } {
    const dateLabel = date || new Date().toISOString().slice(0, 10);
    const startDate = new Date(`${dateLabel}T00:00:00.000`);
    const endDate = new Date(`${dateLabel}T23:59:59.999`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
    }

    return { dateLabel, startDate, endDate };
  }

  /** Returns all READY orders for this restaurant (pending billing). */
  async getReadyOrders(restaurantId: number): Promise<Order[]> {
    return this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .where('order.restaurantId = :restaurantId', { restaurantId })
      .andWhere('order.status = :status', { status: OrderStatus.READY })
      .orderBy('order.createdAt', 'ASC')
      .getMany();
  }

  /**
   * Creates an invoice for a READY order, marks the order as BILLED,
   * and returns the saved invoice.
   */
  async createInvoice(
    dto: CreateInvoiceDto,
    restaurantId: number,
    adminId?: number,
  ): Promise<Invoice> {
    const {
      orderId,
      taxAmount = 0,
      serviceCharge = 0,
      discountAmount = 0,
    } = dto;

    // Load the order
    const order = await this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .where('order.orderId = :orderId', { orderId })
      .andWhere('order.restaurantId = :restaurantId', { restaurantId })
      .getOne();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.READY && order.status !== OrderStatus.SERVED) {
      throw new BadRequestException(
        `Order must be in READY or SERVED status to create an invoice. Current status: ${order.status}`,
      );
    }

    // Check if invoice already exists for this order
    const existing = await this.invoicesRepository.findOne({
      where: { orderId },
    });
    if (existing) {
      // Return existing invoice (idempotent re-print)
      return existing;
    }

    const subtotal = order.subtotal && parseFloat(order.subtotal.toString()) > 0
      ? parseFloat(order.subtotal.toString())
      : parseFloat(order.totalAmount.toString());

    const tax = parseFloat(taxAmount.toString());

    // If serviceCharge is explicitly provided in DTO (override), use it. 
    // Otherwise use the one calculated at order time.
    const charge = dto.serviceCharge !== undefined
      ? parseFloat(serviceCharge.toString())
      : (order.serviceCharge ? parseFloat(order.serviceCharge.toString()) : 0);

    const discount = parseFloat(discountAmount.toString());
    const total = subtotal + tax + charge - discount;

    const invoice = this.buildInvoiceSnapshot(order, adminId, {
      subtotal,
      taxAmount: tax,
      serviceCharge: charge,
      discountAmount: discount,
      totalAmount: total,
    });

    const savedInvoice = await this.invoicesRepository.save(invoice);
    savedInvoice.orderNo = order.orderNo || undefined;

    // Transition order to BILLED
    order.status = OrderStatus.BILLED;
    await this.ordersRepository.save(order);

    // Notify connected clients in real-time
    this.websocketGateway.emitOrderStatusUpdate({
      orderId: order.orderId,
      orderNo: order.orderNo,
      tableNo: order.tableNo,
      status: order.status,
      restaurantId: order.restaurantId,
    });
    this.websocketGateway.server.emit('dashboard:refresh');

    return savedInvoice;
  }

  /** Creates or returns an invoice snapshot for an order so it can be handed off to cashier. */
  async createOrGetInvoiceForOrder(
    orderId: number,
    restaurantId: number,
    adminId?: number,
  ): Promise<Invoice> {
    const existing = await this.invoicesRepository.findOne({
      where: { orderId, restaurantId },
    });

    if (existing) {
      return this.hydrateOrderNo(existing);
    }

    const order = await this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'orderItems')
      .where('order.orderId = :orderId', { orderId })
      .andWhere('order.restaurantId = :restaurantId', { restaurantId })
      .getOne();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Cancelled orders cannot be sent to cashier.',
      );
    }

    const invoice = this.buildInvoiceSnapshot(order, adminId);
    const savedInvoice = await this.invoicesRepository.save(invoice);
    savedInvoice.orderNo = order.orderNo || undefined;
    return savedInvoice;
  }

  /** Marks an invoice as sent to cashier and returns the updated invoice. */
  async sendInvoiceToCashier(
    invoiceId: number,
    restaurantId: number,
  ): Promise<Invoice> {
    const invoice = await this.findOneInvoice(invoiceId, restaurantId);

    // Idempotency guard: avoid duplicate cashier handoff events for same invoice.
    if (invoice.isSentToCashier) {
      return this.hydrateOrderNo(invoice);
    }

    invoice.isSentToCashier = true;
    invoice.sentToCashierAt = new Date();
    const savedInvoice = await this.invoicesRepository.save(invoice);

    this.websocketGateway.server.emit('dashboard:refresh');
    this.websocketGateway.emitToRole('cashier', 'cashier:queue-update', {
      invoiceId: savedInvoice.invoiceId,
      orderId: savedInvoice.orderId,
      restaurantId: savedInvoice.restaurantId,
    });

    return this.hydrateOrderNo(savedInvoice);
  }

  /** Returns invoices that were sent from KDS to cashier and still need cashier attention. */
  async getCashierQueue(restaurantId: number): Promise<Invoice[]> {
    const invoices = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .where('invoice.restaurantId = :restaurantId', { restaurantId })
      .andWhere('invoice.isSentToCashier = :isSentToCashier', {
        isSentToCashier: true,
      })
      .andWhere('invoice.invoiceStatus = :status', {
        status: InvoiceStatus.PENDING,
      })
      .orderBy('invoice.sentToCashierAt', 'DESC')
      .addOrderBy('invoice.createdAt', 'DESC')
      .getMany();

    return this.hydrateOrderNos(invoices);
  }

  /** Returns PAID cashier transactions for a day that are not accepted by accountant yet. */
  async getCashierTransactionsForDate(
    restaurantId: number,
    date?: string,
  ): Promise<Invoice[]> {
    const { startDate, endDate } = this.resolveDateBounds(date);

    const invoices = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .where('invoice.restaurantId = :restaurantId', { restaurantId })
      .andWhere('invoice.invoiceStatus = :status', {
        status: InvoiceStatus.PAID,
      })
      .andWhere('invoice.updatedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere(
        'COALESCE(invoice.accountantTransferStatus, :noneStatus) != :acceptedStatus',
        {
          noneStatus: AccountantTransferStatus.NONE,
          acceptedStatus: AccountantTransferStatus.ACCEPTED,
        },
      )
      .orderBy('invoice.updatedAt', 'DESC')
      .getMany();

    return this.hydrateOrderNos(invoices);
  }

  /** Sends PAID day transactions to accountant for review (manual or auto mode). */
  async sendTransactionsToAccountant(
    restaurantId: number,
    cashierUserId: number,
    payload: {
      date?: string;
      mode?: 'MANUAL' | 'AUTO';
      invoiceIds?: number[];
    },
  ) {
    const { dateLabel, startDate, endDate } = this.resolveDateBounds(
      payload.date,
    );
    const mode = payload.mode || 'MANUAL';

    const query = this.invoicesRepository
      .createQueryBuilder('invoice')
      .where('invoice.restaurantId = :restaurantId', { restaurantId })
      .andWhere('invoice.invoiceStatus = :status', {
        status: InvoiceStatus.PAID,
      })
      .andWhere('invoice.updatedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere(
        'COALESCE(invoice.accountantTransferStatus, :noneStatus) != :acceptedStatus',
        {
          noneStatus: AccountantTransferStatus.NONE,
          acceptedStatus: AccountantTransferStatus.ACCEPTED,
        },
      );

    if (Array.isArray(payload.invoiceIds) && payload.invoiceIds.length > 0) {
      query.andWhere('invoice.invoiceId IN (:...invoiceIds)', {
        invoiceIds: payload.invoiceIds,
      });
    }

    const invoices = await query.getMany();

    if (invoices.length === 0) {
      throw new BadRequestException(
        'No eligible transactions found for transfer.',
      );
    }

    const now = new Date();
    invoices.forEach((invoice) => {
      invoice.accountantTransferStatus = AccountantTransferStatus.PENDING;
      invoice.sentToAccountantAt = now;
      invoice.sentToAccountantByAdminId = cashierUserId;
      invoice.acceptedByAccountantAt = null;
      invoice.acceptedByAccountantId = null;
    });

    await this.invoicesRepository.save(invoices);

    this.websocketGateway.emitToRole(
      'accountant',
      'accountant:transfer-request',
      {
        restaurantId,
        date: dateLabel,
        mode,
        count: invoices.length,
        invoiceIds: invoices.map((invoice) => invoice.invoiceId),
        sentAt: now.toISOString(),
      },
    );

    this.websocketGateway.emitToRole('cashier', 'accountant:transfer-updated', {
      restaurantId,
      date: dateLabel,
      status: AccountantTransferStatus.PENDING,
      count: invoices.length,
    });

    return {
      success: true,
      message: `${invoices.length} transaction(s) sent to accountant.`,
      date: dateLabel,
      mode,
      count: invoices.length,
      invoices: await this.hydrateOrderNos(invoices),
    };
  }

  /** Returns transactions waiting for accountant review. */
  async getAccountantPendingTransactions(
    restaurantId: number,
    date?: string,
  ): Promise<Invoice[]> {
    const query = this.invoicesRepository
      .createQueryBuilder('invoice')
      .where('invoice.restaurantId = :restaurantId', { restaurantId })
      .andWhere('invoice.accountantTransferStatus = :status', {
        status: AccountantTransferStatus.PENDING,
      })
      .orderBy('invoice.sentToAccountantAt', 'DESC')
      .addOrderBy('invoice.updatedAt', 'DESC');

    if (date) {
      const { startDate, endDate } = this.resolveDateBounds(date);
      query.andWhere(
        'invoice.sentToAccountantAt BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    const invoices = await query.getMany();
    return this.hydrateOrderNos(invoices);
  }

  /** Returns accountant-accepted transactions. */
  async getAccountantAcceptedTransactions(
    restaurantId: number,
    date?: string,
  ): Promise<Invoice[]> {
    const query = this.invoicesRepository
      .createQueryBuilder('invoice')
      .where('invoice.restaurantId = :restaurantId', { restaurantId })
      .andWhere('invoice.accountantTransferStatus = :status', {
        status: AccountantTransferStatus.ACCEPTED,
      })
      .orderBy('invoice.acceptedByAccountantAt', 'DESC')
      .addOrderBy('invoice.updatedAt', 'DESC');

    if (date) {
      const { startDate, endDate } = this.resolveDateBounds(date);
      query.andWhere(
        'invoice.acceptedByAccountantAt BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    const invoices = await query.getMany();
    return this.hydrateOrderNos(invoices);
  }

  /** Accountant accepts pending transfers; accepted transactions are removed from cashier day list. */
  async acceptTransactionsByAccountant(
    restaurantId: number,
    accountantUserId: number,
    payload: { date?: string; invoiceIds?: number[] },
  ) {
    const query = this.invoicesRepository
      .createQueryBuilder('invoice')
      .where('invoice.restaurantId = :restaurantId', { restaurantId })
      .andWhere('invoice.accountantTransferStatus = :status', {
        status: AccountantTransferStatus.PENDING,
      });

    if (Array.isArray(payload.invoiceIds) && payload.invoiceIds.length > 0) {
      query.andWhere('invoice.invoiceId IN (:...invoiceIds)', {
        invoiceIds: payload.invoiceIds,
      });
    } else if (payload.date) {
      const { startDate, endDate } = this.resolveDateBounds(payload.date);
      query.andWhere(
        'invoice.sentToAccountantAt BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    const invoices = await query.getMany();
    if (invoices.length === 0) {
      throw new BadRequestException('No pending transactions found to accept.');
    }

    const now = new Date();
    invoices.forEach((invoice) => {
      invoice.accountantTransferStatus = AccountantTransferStatus.ACCEPTED;
      invoice.acceptedByAccountantAt = now;
      invoice.acceptedByAccountantId = accountantUserId;
    });

    await this.invoicesRepository.save(invoices);

    this.websocketGateway.emitToRole(
      'cashier',
      'accountant:transfer-reviewed',
      {
        restaurantId,
        action: 'ACCEPTED',
        count: invoices.length,
        invoiceIds: invoices.map((invoice) => invoice.invoiceId),
        reviewedAt: now.toISOString(),
      },
    );

    return {
      success: true,
      message: `${invoices.length} transaction(s) accepted by accountant.`,
      count: invoices.length,
      invoices: await this.hydrateOrderNos(invoices),
    };
  }

  /** Accountant rejects pending transfers; transactions stay with cashier. */
  async rejectTransactionsByAccountant(
    restaurantId: number,
    payload: { date?: string; invoiceIds?: number[] },
  ) {
    const query = this.invoicesRepository
      .createQueryBuilder('invoice')
      .where('invoice.restaurantId = :restaurantId', { restaurantId })
      .andWhere('invoice.accountantTransferStatus = :status', {
        status: AccountantTransferStatus.PENDING,
      });

    if (Array.isArray(payload.invoiceIds) && payload.invoiceIds.length > 0) {
      query.andWhere('invoice.invoiceId IN (:...invoiceIds)', {
        invoiceIds: payload.invoiceIds,
      });
    } else if (payload.date) {
      const { startDate, endDate } = this.resolveDateBounds(payload.date);
      query.andWhere(
        'invoice.sentToAccountantAt BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    const invoices = await query.getMany();
    if (invoices.length === 0) {
      throw new BadRequestException('No pending transactions found to reject.');
    }

    const now = new Date();
    invoices.forEach((invoice) => {
      invoice.accountantTransferStatus = AccountantTransferStatus.NONE;
      invoice.sentToAccountantAt = null;
      invoice.sentToAccountantByAdminId = null;
      invoice.acceptedByAccountantAt = null;
      invoice.acceptedByAccountantId = null;
    });

    await this.invoicesRepository.save(invoices);

    this.websocketGateway.emitToRole(
      'cashier',
      'accountant:transfer-reviewed',
      {
        restaurantId,
        action: 'REJECTED',
        count: invoices.length,
        invoiceIds: invoices.map((invoice) => invoice.invoiceId),
        reviewedAt: now.toISOString(),
      },
    );

    return {
      success: true,
      message: `${invoices.length} transaction(s) were kept with cashier.`,
      count: invoices.length,
      invoices: await this.hydrateOrderNos(invoices),
    };
  }

  /** Marks an invoice as printed by cashier. */
  async markInvoicePrinted(
    invoiceId: number,
    restaurantId: number,
  ): Promise<Invoice> {
    const invoice = await this.findOneInvoice(invoiceId, restaurantId);
    invoice.isPrinted = true;
    const savedInvoice = await this.invoicesRepository.save(invoice);
    return this.hydrateOrderNo(savedInvoice);
  }

  /** Marks a BILLED order as SERVED. */
  async markOrderServed(orderId: number, restaurantId: number): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { orderId, restaurantId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.BILLED) {
      throw new BadRequestException(
        `Order must be in BILLED status to mark as served. Current status: ${order.status}`,
      );
    }

    order.status = OrderStatus.SERVED;
    const saved = await this.ordersRepository.save(order);

    this.websocketGateway.emitOrderStatusUpdate({
      orderId: saved.orderId,
      orderNo: saved.orderNo,
      tableNo: saved.tableNo,
      status: saved.status,
      restaurantId: saved.restaurantId,
    });
    this.websocketGateway.server.emit('dashboard:refresh');

    return saved;
  }

  /** Returns a paginated list of invoices for this restaurant. */
  async findAllInvoices(
    restaurantId: number,
    queryDto: QueryInvoicesDto = {},
  ): Promise<Invoice[]> {
    const { status, from, to, tableNo, invoiceNumber } = queryDto;

    const query = this.invoicesRepository
      .createQueryBuilder('invoice')
      .where('invoice.restaurantId = :restaurantId', { restaurantId })
      .orderBy('invoice.createdAt', 'DESC');

    if (status) {
      query.andWhere('invoice.invoiceStatus = :status', { status });
    }

    if (from || to) {
      const startDate = from
        ? new Date(`${from}T00:00:00.000Z`)
        : new Date('1970-01-01');
      const endDate = to
        ? new Date(`${to}T23:59:59.999Z`)
        : new Date('2099-12-31');
      query.andWhere('invoice.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (tableNo) {
      query.andWhere('invoice.tableNo LIKE :tableNo', {
        tableNo: `%${tableNo}%`,
      });
    }

    if (invoiceNumber) {
      query.andWhere('invoice.invoiceNumber LIKE :invoiceNumber', {
        invoiceNumber: `%${invoiceNumber}%`,
      });
    }

    const invoices = await query.getMany();
    return this.hydrateOrderNos(invoices);
  }

  /** Returns a single invoice (scoped to restaurantId for security). */
  async findOneInvoice(
    invoiceId: number,
    restaurantId: number,
  ): Promise<Invoice> {
    const invoice = await this.invoicesRepository.findOne({
      where: { invoiceId, restaurantId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice #${invoiceId} not found`);
    }

    return this.hydrateOrderNo(invoice);
  }

  /** Marks an invoice's isSentWhatsapp flag as true. */
  async markWhatsappSent(
    invoiceId: number,
    restaurantId: number,
  ): Promise<Invoice> {
    const invoice = await this.findOneInvoice(invoiceId, restaurantId);
    invoice.isSentWhatsapp = true;
    const savedInvoice = await this.invoicesRepository.save(invoice);
    return this.hydrateOrderNo(savedInvoice);
  }

  /** Marks an invoice as PAID. */
  async markInvoicePaid(
    invoiceId: number,
    restaurantId: number,
  ): Promise<Invoice> {
    const invoice = await this.findOneInvoice(invoiceId, restaurantId);

    // Final closing safety checks: Ensure bill was printed and sent to WhatsApp (if applicable)
    if (!invoice.isPrinted) {
      throw new BadRequestException(
        'The bill must be printed (hard copy) before it can be closed.',
      );
    }

    if (invoice.whatsappNumber && !invoice.isSentWhatsapp) {
      throw new BadRequestException(
        'The bill must be sent via WhatsApp before it can be closed.',
      );
    }

    invoice.invoiceStatus = InvoiceStatus.PAID;
    const savedInvoice = await this.invoicesRepository.save(invoice);
    return this.hydrateOrderNo(savedInvoice);
  }

  /** Records a bill action (PDF download, print, or WhatsApp send). */
  async recordBillAction(
    dto: RecordBillActionDto,
    restaurantId: number,
    userId?: number,
    ipAddress?: string,
  ): Promise<BillAction> {
    // Verify invoice exists and belongs to this restaurant
    const invoice = await this.invoicesRepository.findOne({
      where: { invoiceId: dto.invoiceId, restaurantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Create bill action record
    const billAction = this.billActionsRepository.create({
      invoiceId: dto.invoiceId,
      orderId: dto.orderId,
      restaurantId,
      actionType: dto.actionType,
      userId: userId ?? null,
      deviceInfo: dto.deviceInfo ?? null,
      ipAddress: ipAddress ?? null,
      notes: dto.notes ?? null,
    });

    const saved = await this.billActionsRepository.save(billAction);

    // Update invoice flags based on action type
    if (dto.actionType === BillActionType.BILL_PRINTED) {
      invoice.isPrinted = true;
    } else if (dto.actionType === BillActionType.WHATSAPP_SENT) {
      invoice.isSentWhatsapp = true;
    }
    // PDF_DOWNLOADED doesn't directly update invoice flags but is tracked

    await this.invoicesRepository.save(invoice);

    return saved;
  }

  /** Retrieves bill action history for an order. */
  async getBillActionHistory(
    orderId: number,
    restaurantId: number,
  ): Promise<BillActionHistoryDto[]> {
    const billActions = await this.billActionsRepository
      .createQueryBuilder('ba')
      .where('ba.orderId = :orderId', { orderId })
      .andWhere('ba.restaurantId = :restaurantId', { restaurantId })
      .orderBy('ba.createdAt', 'ASC')
      .getMany();

    return billActions.map((action) => ({
      billActionId: action.billActionId,
      invoiceId: action.invoiceId,
      orderId: action.orderId,
      actionType: action.actionType,
      userId: action.userId,
      deviceInfo: action.deviceInfo,
      createdAt: action.createdAt,
      notes: action.notes,
    }));
  }

  /**
   * Retrieves a summary of all bill actions for an invoice.
   * Useful for checking if PDF was downloaded, bill was printed, WhatsApp was sent.
   */
  async getBillActionSummary(invoiceId: number, restaurantId: number) {
    const billActions = await this.billActionsRepository
      .createQueryBuilder('ba')
      .where('ba.invoiceId = :invoiceId', { invoiceId })
      .andWhere('ba.restaurantId = :restaurantId', { restaurantId })
      .orderBy('ba.createdAt', 'ASC')
      .getMany();

    return {
      invoiceId,
      pdfDownloads: billActions.filter(
        (a) => a.actionType === BillActionType.PDF_DOWNLOADED,
      ),
      prints: billActions.filter(
        (a) => a.actionType === BillActionType.BILL_PRINTED,
      ),
      whatsappSends: billActions.filter(
        (a) => a.actionType === BillActionType.WHATSAPP_SENT,
      ),
      totalActions: billActions.length,
      allActions: billActions,
    };
  }
}
