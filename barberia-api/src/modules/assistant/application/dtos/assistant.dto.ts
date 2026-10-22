import type { AppointmentDto } from '../../../appointments/application/dtos/appointment.dto.js';

export type AssistantAction =
  | 'appointment_created'
  | 'appointments_listed'
  | 'appointment_cancelled'
  | 'needs_confirmation'
  | 'none';

export interface AssistantCommandInput {
  text?: string;
  /** Sent by the client after the user confirmed a pending cancellation. */
  confirmCancelId?: number;
}

export interface AssistantResult {
  reply: string;
  action: AssistantAction;
  appointment?: AppointmentDto;
  appointments?: AppointmentDto[];
  pendingCancelId?: number;
}
