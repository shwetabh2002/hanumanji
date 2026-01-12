import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { Booking, BookingSchema } from './schemas/booking.schema';
import { BookingService } from './booking.service';
import { BookingStateService } from './services/booking-state.service';
import { FareService } from './services/fare.service';
import { BookingController } from './booking.controller';
import { BookingEventHandler } from './handlers/booking-event.handler';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),
  ],
  providers: [BookingService, BookingStateService, FareService, BookingEventHandler],
  controllers: [BookingController],
  exports: [BookingService, BookingStateService, FareService],
})
export class BookingModule {}
