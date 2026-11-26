import { Inject, Injectable } from '@nestjs/common';
import { ScheduleAppointmentUseCase } from '../../../appointments/application/use-cases/schedule-appointment.use-case.js';
import { NotifyNewBookingUseCase } from '../../../notifications/application/use-cases/notify-new-booking.use-case.js';
import { GetServicePriceUseCase } from '../../../shop-settings/application/use-cases/get-service-price.use-case.js';
import { BookingName } from '../../domain/entities/booking-name.entity.js';
import { ClientPhone } from '../../domain/entities/client-phone.entity.js';
import { InvalidWebBookingError } from '../../domain/errors/invalid-web-booking.error.js';
import { SlotUnavailableError } from '../../domain/errors/slot-unavailable.error.js';
import { TooManyBookingsError } from '../../domain/errors/too-many-bookings.error.js';
import { WEB_BOOKING_ACTIVITY } from '../../domain/ports/web-booking-activity.port.js';
import type { WebBookingActivity } from '../../domain/ports/web-booking-activity.port.js';
import type { BookFromWebInput, BookFromWebResult } from '../dtos/web-booking.dto.js';
import { WebBookingAccess } from '../web-booking-access.js';
import { priceOrZero } from './get-public-slots.use-case.js';

/** Web bookings per IP in the last hour. */
const MAX_PER_IP_PER_HOUR = 3;
/** Web bookings in the last hour, across all clients (same as MAX_BOOKINGS_PER_HOUR on WhatsApp). */
const MAX_PER_HOUR = 6;
const HOUR_MS = 60 * 60_000;

/**
 * A client books from the public page with only a name and a phone: today or tomorrow and a free
 * slot. A phone may hold several bookings (e.g. a parent booking for two children with the same
 * number). Returns the token of the private link.
 */
@Injectable()
export class BookFromWebUseCase {
  constructor(
    private readonly access: WebBookingAccess,
    private readonly schedule: ScheduleAppointmentUseCase,
    private readonly servicePrice: GetServicePriceUseCase,
    private readonly notifyNewBooking: NotifyNewBookingUseCase,
    @Inject(WEB_BOOKING_ACTIVITY) private readonly activity: WebBookingActivity,
  ) {}

  async execute(input: BookFromWebInput): Promise<BookFromWebResult> {
    const name = BookingName.parse(input.name);
    const phone = ClientPhone.parse(input.phone);
    if (!this.access.offeredDates().includes(input.date)) {
      throw new InvalidWebBookingError('date', `Date not offered: ${input.date}`);
    }

    const now = Date.now();
    if (
      (await this.activity.countSince(input.ip, now - HOUR_MS)) >= MAX_PER_IP_PER_HOUR ||
      (await this.activity.countSince(null, now - HOUR_MS)) >= MAX_PER_HOUR
    ) {
      throw new TooManyBookingsError('Too many web bookings in the last hour');
    }

    // The page only offers free slots; one taken in between fails here with the scheduling rules.
    const free = (await this.access.slots()).find((d) => d.date === input.date)?.times ?? [];
    if (!free.includes(input.time)) {
      throw new SlotUnavailableError(`${input.date} at ${input.time} is not free`);
    }
    const appointment = await this.schedule.execute({
      client: name.value,
      date: input.date,
      time: input.time,
      serviceCost: await priceOrZero(this.servicePrice),
      extras: [],
      phone: phone.value,
    });
    await this.activity.record(input.ip, now);
    // Tells the barber's phone; it never throws.
    await this.notifyNewBooking.execute({ client: appointment.client, date: appointment.date, time: appointment.time });

    return { booking: await this.access.toDto(appointment), token: this.access.sign(appointment.id) };
  }
}
