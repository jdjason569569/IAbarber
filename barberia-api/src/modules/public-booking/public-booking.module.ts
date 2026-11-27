import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ShopSettingsModule } from '../shop-settings/shop-settings.module.js';
import { BookFromWebUseCase } from './application/use-cases/book-from-web.use-case.js';
import { FindWebBookingsUseCase } from './application/use-cases/find-web-bookings.use-case.js';
import { CancelWebBookingUseCase } from './application/use-cases/cancel-web-booking.use-case.js';
import { GetPublicSlotsUseCase } from './application/use-cases/get-public-slots.use-case.js';
import { GetWebBookingUseCase } from './application/use-cases/get-web-booking.use-case.js';
import { RescheduleWebBookingUseCase } from './application/use-cases/reschedule-web-booking.use-case.js';
import { WebBookingAccess } from './application/web-booking-access.js';
import { BOOKING_LINK_SIGNER } from './domain/ports/booking-link-signer.port.js';
import { WEB_BOOKING_ACTIVITY, WEB_BOOKING_LOOKUPS } from './domain/ports/web-booking-activity.port.js';
import { HmacBookingLinkSigner } from './infrastructure/external/hmac-booking-link-signer.js';
import { PublicBookingController } from './infrastructure/http/public-booking.controller.js';
import { InMemoryWebBookingActivity } from './infrastructure/persistence/in-memory-web-booking-activity.js';

/** Third booking channel: the public page `/reservar` (name and phone, no email, no login). */
@Module({
  imports: [AppointmentsModule, NotificationsModule, ShopSettingsModule],
  controllers: [PublicBookingController],
  providers: [
    WebBookingAccess,
    GetPublicSlotsUseCase,
    BookFromWebUseCase,
    GetWebBookingUseCase,
    CancelWebBookingUseCase,
    RescheduleWebBookingUseCase,
    FindWebBookingsUseCase,
    { provide: BOOKING_LINK_SIGNER, useClass: HmacBookingLinkSigner },
    { provide: WEB_BOOKING_ACTIVITY, useClass: InMemoryWebBookingActivity },
    { provide: WEB_BOOKING_LOOKUPS, useClass: InMemoryWebBookingActivity },
  ],
})
export class PublicBookingModule {}
