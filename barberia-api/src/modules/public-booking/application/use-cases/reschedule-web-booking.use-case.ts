import { Injectable } from '@nestjs/common';
import { RescheduleAppointmentUseCase } from '../../../appointments/application/use-cases/reschedule-appointment.use-case.js';
import { NotifyBookingChangeUseCase } from '../../../notifications/application/use-cases/notify-booking-change.use-case.js';
import { RescheduleLimitError } from '../../domain/errors/reschedule-limit.error.js';
import { SlotUnavailableError } from '../../domain/errors/slot-unavailable.error.js';
import { TooLateToChangeError } from '../../domain/errors/too-late-to-change.error.js';
import type { WebBookingDto } from '../dtos/web-booking.dto.js';
import { MAX_RESCHEDULES, WebBookingAccess } from '../web-booking-access.js';

/**
 * The client moves their booking from the private link to another free slot of today or tomorrow,
 * once, up to CHANGE_CUTOFF_MINUTES before it starts.
 */
@Injectable()
export class RescheduleWebBookingUseCase {
  constructor(
    private readonly access: WebBookingAccess,
    private readonly reschedule: RescheduleAppointmentUseCase,
    private readonly notifyBookingChange: NotifyBookingChangeUseCase,
  ) {}

  async execute(id: number, token: string, date: string, time: string): Promise<WebBookingDto> {
    const booking = await this.access.findByLink(id, token);
    if (!this.access.isChangeable(booking)) {
      throw new TooLateToChangeError('The booking can no longer be moved from the web');
    }
    if (booking.rescheduleCount >= MAX_RESCHEDULES) {
      throw new RescheduleLimitError('The booking was already moved');
    }
    // Only the slots the page offers: RescheduleAppointmentUseCase does not check the weekly hours.
    const free = (await this.access.slots()).find((d) => d.date === date)?.times ?? [];
    if (!free.includes(time)) {
      throw new SlotUnavailableError(`${date} at ${time} is not free`);
    }
    const moved = await this.reschedule.execute(booking.id, date, time);
    await this.notifyBookingChange.execute({
      kind: 'rescheduled',
      client: moved.client,
      date: moved.date,
      time: moved.time,
    });
    return this.access.toDto(moved);
  }
}
