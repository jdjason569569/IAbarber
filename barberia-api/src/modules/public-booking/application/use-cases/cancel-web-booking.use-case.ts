import { Injectable } from '@nestjs/common';
import { SetAppointmentCancelledUseCase } from '../../../appointments/application/use-cases/set-appointment-cancelled.use-case.js';
import { NotifyBookingChangeUseCase } from '../../../notifications/application/use-cases/notify-booking-change.use-case.js';
import { TooLateToChangeError } from '../../domain/errors/too-late-to-change.error.js';
import type { WebBookingDto } from '../dtos/web-booking.dto.js';
import { WebBookingAccess } from '../web-booking-access.js';

/** The client cancels their booking from the private link, up to CHANGE_CUTOFF_MINUTES before it. */
@Injectable()
export class CancelWebBookingUseCase {
  constructor(
    private readonly access: WebBookingAccess,
    private readonly setCancelled: SetAppointmentCancelledUseCase,
    private readonly notifyBookingChange: NotifyBookingChangeUseCase,
  ) {}

  async execute(id: number, token: string): Promise<WebBookingDto> {
    const booking = await this.access.findByLink(id, token);
    if (booking.cancelled) return this.access.toDto(booking);
    if (!this.access.isChangeable(booking)) {
      throw new TooLateToChangeError('The booking can no longer be cancelled from the web');
    }
    const cancelled = await this.setCancelled.execute(booking.id, true);
    await this.notifyBookingChange.execute({
      kind: 'cancelled',
      client: cancelled.client,
      date: cancelled.date,
      time: cancelled.time,
    });
    return this.access.toDto(cancelled);
  }
}
