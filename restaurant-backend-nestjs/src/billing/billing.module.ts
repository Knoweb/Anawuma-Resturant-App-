import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { Invoice } from './entities/invoice.entity';
import { BillAction } from './entities/bill-action.entity';
import { InvoiceDeleteRequest } from './entities/invoice-delete-request.entity';
import { Order } from '../orders/entities/order.entity';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, BillAction, Order, InvoiceDeleteRequest]),
    WebsocketModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
