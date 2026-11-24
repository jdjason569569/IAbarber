import { Injectable } from '@nestjs/common';
import type { WebBookingDto } from '../dtos/web-booking.dto.js';
import { WebBookingAccess } from '../web-booking-access.js';

/** The booking behind a private link, with what the client may still do with it. */
@Injectable()
export class GetWebBookingUseCase {
  constructor(private readonly access: WebBookingAccess) {}

  async execute(id: number, token: string): Promise<WebBookingDto> {
    return this.access.toDto(await this.access.findByLink(id, token));
  }
}
