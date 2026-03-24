import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { MenusModule } from './menus/menus.module';
import { CategoriesModule } from './categories/categories.module';
import { SubcategoriesModule } from './subcategories/subcategories.module';
import { FoodItemsModule } from './food-items/food-items.module';
import { OrdersModule } from './orders/orders.module';
import { TableQrModule } from './table-qr/table-qr.module';
import { ReportsModule } from './reports/reports.module';
import { RoomQrModule } from './room-qr/room-qr.module';
import { HousekeepingModule } from './housekeeping/housekeeping.module';
import { OffersModule } from './offers/offers.module';
import { WebsocketModule } from './websocket/websocket.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SettingsRequestsModule } from './settings-requests/settings-requests.module';
import { ContactModule } from './contact/contact.module';
import { BillingModule } from './billing/billing.module';
import { PricingModule } from './pricing/pricing.module';
import { BlogModule } from './blog/blog.module';
import { AboutModule } from './about/about.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 300, // 300 requests per 60 seconds per IP
    }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: true, // Set to false in production
        logging: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    RestaurantsModule,
    MenusModule,
    CategoriesModule,
    SubcategoriesModule,
    FoodItemsModule,
    OrdersModule,
    TableQrModule,
    ReportsModule,
    RoomQrModule,
    HousekeepingModule,
    OffersModule,
    WebsocketModule,
    DashboardModule,
    SettingsRequestsModule,
    ContactModule,
    BillingModule,
    PricingModule,
    BlogModule,
    AboutModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
