import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AboutService } from './about.service';
import { AboutController } from './about.controller';
import { About } from './entities/about.entity';

@Module({
  imports: [TypeOrmModule.forFeature([About])],
  controllers: [AboutController],
  providers: [AboutService],
})
export class AboutModule {}
