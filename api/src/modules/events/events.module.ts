import { Module } from '@nestjs/common';
import { DashboardEventsService } from './application/dashboard-events.service';
import { DashboardStreamController } from './presentation/dashboard-stream.controller';

@Module({
  controllers: [DashboardStreamController],
  providers: [DashboardEventsService],
  exports: [DashboardEventsService],
})
export class EventsModule {}
