import { DomainError } from '../../../../shared/errors/domain.error.js';
import type { AppointmentDto } from '../../application/dtos/appointment.dto.js';

/** Some active appointments fall inside the hours the barber wants to block. */
export class BlocksClashWithAppointmentsError extends DomainError {
  constructor(readonly appointments: AppointmentDto[]) {
    super(`${appointments.length} active appointment(s) fall inside the blocked hours`);
  }
}
