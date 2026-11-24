import { Inject, Injectable } from '@nestjs/common';
import type { AppointmentDto } from '../../appointments/application/dtos/appointment.dto.js';
import { ListAppointmentsUseCase } from '../../appointments/application/use-cases/list-appointments.use-case.js';
import { ListAvailableSlotsUseCase } from '../../appointments/application/use-cases/list-available-slots.use-case.js';
import { addDays, localIsoDate } from '../../../shared/utils/local-date.js';
import { InvalidBookingLinkError } from '../domain/errors/invalid-booking-link.error.js';
import { BOOKING_LINK_SIGNER } from '../domain/ports/booking-link-signer.port.js';
import type { BookingLinkSigner } from '../domain/ports/booking-link-signer.port.js';
import type { PublicDaySlotsDto, WebBookingDto } from './dtos/web-booking.dto.js';

// Same rules as the WhatsApp bot (CHANGE_CUTOFF_MINUTES and MAX_RESCHEDULES in
// reply-to-client-message.use-case.ts): changes up to 30 minutes before, and one move per booking.
export const CHANGE_CUTOFF_MINUTES = 30;
export const MAX_RESCHEDULES = 1;

/** Shared by the web booking use cases: offered days, free slots and reading a booking by its link. */
@Injectable()
export class WebBookingAccess {
  constructor(
    @Inject(BOOKING_LINK_SIGNER) private readonly signer: BookingLinkSigner,
    private readonly availableSlots: ListAvailableSlotsUseCase,
    private readonly appointments: ListAppointmentsUseCase,
  ) {}

  /** Today and tomorrow, like the WhatsApp bot. */
  offeredDates(): string[] {
    const today = localIsoDate();
    return [today, addDays(today, 1)];
  }

  async slots(): Promise<PublicDaySlotsDto[]> {
    const days = await this.availableSlots.execute(this.offeredDates());
    return days.map((d, index) => ({ date: d.date, day: index === 0 ? 'today' : 'tomorrow', times: d.times }));
  }

  /** All appointments of the workspace (the agenda is small: one barber). */
  all(): Promise<AppointmentDto[]> {
    return this.appointments.execute();
  }

  sign(id: number): string {
    return this.signer.sign(id);
  }

  /** The booking the link points to; the same error for a wrong token and a missing booking. */
  async findByLink(id: number, token: string): Promise<AppointmentDto> {
    if (!Number.isSafeInteger(id) || id <= 0 || !this.signer.verify(id, token)) {
      throw new InvalidBookingLinkError('Invalid booking link');
    }
    const appointment = (await this.all()).find((a) => a.id === id);
    if (!appointment || appointment.walkIn) {
      throw new InvalidBookingLinkError('Invalid booking link');
    }
    return appointment;
  }

  /** True while the booking holds its slot and starts more than CHANGE_CUTOFF_MINUTES from now. */
  isChangeable(a: AppointmentDto): boolean {
    return isPending(a) && startOf(a) - Date.now() > CHANGE_CUTOFF_MINUTES * 60_000;
  }

  async toDto(a: AppointmentDto): Promise<WebBookingDto> {
    const canCancel = this.isChangeable(a);
    const canReschedule = canCancel && a.rescheduleCount < MAX_RESCHEDULES;
    return {
      id: a.id,
      client: a.client,
      date: a.date,
      time: a.time,
      price: a.serviceCost,
      status: a.cancelled ? 'cancelled' : a.completed ? 'completed' : startOf(a) <= Date.now() ? 'past' : 'pending',
      canCancel,
      canReschedule,
      slots: canReschedule ? await this.slots() : [],
    };
  }
}

export function isPending(a: AppointmentDto): boolean {
  return !a.cancelled && !a.walkIn && !a.completed;
}

/** Start of the booking (epoch ms); dates are read in the shop's time zone. */
export function startOf(a: { date: string; time: string }): number {
  return new Date(`${a.date}T${a.time}:00`).getTime();
}
