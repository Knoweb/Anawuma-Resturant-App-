import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { RecordBillActionDto } from './dto/record-bill-action.dto';
import {
  AccountantDateQueryDto,
  ReviewTransactionsDto,
  SendTransactionsToAccountantDto,
} from './dto/accountant-transfer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/role.enum';

interface RequestWithUser {
  user: {
    id: number;
    adminId?: number;
    role: UserRole;
    restaurantId: number;
  };
  ip?: string;
  connection?: {
    remoteAddress?: string;
  };
  headers: Record<string, string | string[] | undefined>;
}

const BILLING_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.KITCHEN,
  UserRole.CASHIER,
];

const CASHIER_TRANSFER_ROLES: UserRole[] = [
  UserRole.CASHIER,
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
];

const ACCOUNTANT_REVIEW_ROLES: UserRole[] = [
  UserRole.ACCOUNTANT,
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
];

@SkipThrottle()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) { }

  /**
   * GET /billing/ready-orders
   * Returns all READY orders waiting to be billed.
   */
  @Get('ready-orders')
  @Roles(...BILLING_ROLES)
  getReadyOrders(@Request() req: RequestWithUser) {
    return this.billingService.getReadyOrders(req.user.restaurantId);
  }

  /**
   * POST /billing/invoices
   * Creates an invoice for a READY order and transitions it to BILLED.
   */
  @Post('invoices')
  @Roles(...BILLING_ROLES)
  createInvoice(
    @Body() dto: CreateInvoiceDto,
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.createInvoice(
      dto,
      req.user.restaurantId,
      req.user.adminId ?? req.user.id,
    );
  }

  /**
   * POST /billing/manual/finalize
   * Aggregates multiple manual orders into one invoice.
   */
  @Post('manual/finalize')
  @Roles(...BILLING_ROLES)
  createManualInvoice(
    @Body() dto: any, // CreateManualInvoiceDto
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.createManualInvoice(
      dto,
      req.user.restaurantId,
      req.user.adminId ?? req.user.id,
    );
  }

  /**
   * POST /billing/orders/:id/create-invoice
   * Creates or returns an invoice snapshot for handoff to cashier.
   */
  @Post('orders/:id/create-invoice')
  @Roles(...BILLING_ROLES)
  createInvoiceForOrder(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.createOrGetInvoiceForOrder(
      id,
      req.user.restaurantId,
      req.user.adminId ?? req.user.id,
    );
  }

  /**
   * GET /billing/invoices
   * Returns invoice history with optional filters.
   */
  @Get('invoices')
  @Roles(...BILLING_ROLES)
  findAllInvoices(
    @Query() queryDto: QueryInvoicesDto,
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.findAllInvoices(req.user.restaurantId, queryDto);
  }

  /**
   * GET /billing/invoices/cashier-queue
   * Returns invoices that were sent from KDS to cashier.
   */
  @Get('invoices/cashier-queue')
  @Roles(...BILLING_ROLES)
  getCashierQueue(@Request() req: RequestWithUser) {
    return this.billingService.getCashierQueue(req.user.restaurantId);
  }

  /**
   * GET /billing/cashier/day-transactions?date=YYYY-MM-DD
   * Returns PAID day transactions that are still with cashier (not accountant-accepted).
   */
  @Get('cashier/day-transactions')
  @Roles(...CASHIER_TRANSFER_ROLES)
  getCashierDayTransactions(
    @Query() query: AccountantDateQueryDto,
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.getCashierTransactionsForDate(
      req.user.restaurantId,
      query.date,
    );
  }

  /**
   * POST /billing/accountant/send
   * Cashier sends selected/day transactions to accountant (manual or auto).
   */
  @Post('accountant/send')
  @Roles(...CASHIER_TRANSFER_ROLES)
  sendTransactionsToAccountant(
    @Body() dto: SendTransactionsToAccountantDto,
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.sendTransactionsToAccountant(
      req.user.restaurantId,
      req.user.id,
      dto,
    );
  }

  /**
   * GET /billing/accountant/pending?date=YYYY-MM-DD
   * Accountant receives pending transaction requests from cashier.
   */
  @Get('accountant/pending')
  @Roles(...ACCOUNTANT_REVIEW_ROLES)
  getAccountantPendingTransactions(
    @Query() query: AccountantDateQueryDto,
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.getAccountantPendingTransactions(
      req.user.restaurantId,
      query.date,
    );
  }

  /**
   * GET /billing/accountant/accepted?date=YYYY-MM-DD
   * Accountant accepted transaction history.
   */
  @Get('accountant/accepted')
  @Roles(...ACCOUNTANT_REVIEW_ROLES)
  getAccountantAcceptedTransactions(
    @Query() query: AccountantDateQueryDto,
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.getAccountantAcceptedTransactions(
      req.user.restaurantId,
      query.date,
    );
  }

  /**
   * POST /billing/accountant/accept
   * Accountant accepts pending transactions. Accepted records leave cashier list.
   */
  @Post('accountant/accept')
  @Roles(...ACCOUNTANT_REVIEW_ROLES)
  acceptTransactionsByAccountant(
    @Body() dto: ReviewTransactionsDto,
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.acceptTransactionsByAccountant(
      req.user.restaurantId,
      req.user.id,
      dto,
    );
  }

  /**
   * POST /billing/accountant/reject
   * Accountant rejects pending transactions. They remain with cashier.
   */
  @Post('accountant/reject')
  @Roles(...ACCOUNTANT_REVIEW_ROLES)
  rejectTransactionsByAccountant(
    @Body() dto: ReviewTransactionsDto,
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.rejectTransactionsByAccountant(
      req.user.restaurantId,
      dto,
    );
  }

  /**
   * GET /billing/invoices/:id
   * Returns a single invoice by ID.
   */
  @Get('invoices/:id')
  @Roles(...BILLING_ROLES)
  findOneInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.findOneInvoice(id, req.user.restaurantId);
  }

  /**
   * PATCH /billing/orders/:id/mark-served
   * Transitions a BILLED order to SERVED.
   */
  @Patch('orders/:id/mark-served')
  @Roles(...BILLING_ROLES)
  markServed(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.markOrderServed(id, req.user.restaurantId);
  }

  /**
   * PATCH /billing/invoices/:id/mark-whatsapp-sent
   * Records that the WhatsApp bill was sent for this invoice.
   */
  @Patch('invoices/:id/mark-whatsapp-sent')
  @Roles(...BILLING_ROLES)
  markWhatsappSent(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.markWhatsappSent(id, req.user.restaurantId);
  }

  /**
   * PATCH /billing/invoices/:id/mark-printed
   * Records that cashier printed the invoice.
   */
  @Patch('invoices/:id/mark-printed')
  @Roles(...BILLING_ROLES)
  markInvoicePrinted(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.markInvoicePrinted(id, req.user.restaurantId);
  }

  /**
   * PATCH /billing/invoices/:id/send-to-cashier
   * Pushes an invoice into the cashier dashboard queue.
   */
  @Patch('invoices/:id/send-to-cashier')
  @Roles(...BILLING_ROLES)
  sendToCashier(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.sendInvoiceToCashier(id, req.user.restaurantId);
  }

  /**
   * PATCH /billing/invoices/:id/mark-paid
   * Marks an invoice as PAID.
   */
  @Patch('invoices/:id/mark-paid')
  @Roles(...BILLING_ROLES)
  markInvoicePaid(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.markInvoicePaid(id, req.user.restaurantId);
  }

  /**
   * POST /billing/bill-actions
   * Records a bill action (PDF download, print, or WhatsApp send).
   */
  @Post('bill-actions')
  @Roles(...BILLING_ROLES)
  recordBillAction(
    @Body() dto: RecordBillActionDto,
    @Request() req: RequestWithUser,
  ) {
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    return this.billingService.recordBillAction(
      dto,
      req.user.restaurantId,
      req.user.id,
      ipAddress,
    );
  }

  /**
   * GET /billing/bill-actions/order/:orderId
   * Retrieves bill action history for a specific order.
   */
  @Get('bill-actions/order/:orderId')
  @Roles(...BILLING_ROLES)
  getBillActionHistory(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.getBillActionHistory(
      orderId,
      req.user.restaurantId,
    );
  }

  /**
   * GET /billing/bill-actions/invoice/:invoiceId/summary
   * Retrieves a summary of all bill actions for an invoice.
   */
  @Get('bill-actions/invoice/:invoiceId/summary')
  @Roles(...BILLING_ROLES)
  getBillActionSummary(
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.billingService.getBillActionSummary(
      invoiceId,
      req.user.restaurantId,
    );
  }
}
