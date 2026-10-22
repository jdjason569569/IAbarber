import { Inject, Injectable } from '@nestjs/common';
import { ListAppointmentsUseCase } from '../../../appointments/application/use-cases/list-appointments.use-case.js';
import { ScheduleAppointmentUseCase } from '../../../appointments/application/use-cases/schedule-appointment.use-case.js';
import { UpdateAppointmentStatusUseCase } from '../../../appointments/application/use-cases/update-appointment-status.use-case.js';
import type { AppointmentDto } from '../../../appointments/application/dtos/appointment.dto.js';
import { AppointmentConflictError } from '../../../appointments/domain/errors/appointment-conflict.error.js';
import { InvalidAppointmentError } from '../../../appointments/domain/errors/invalid-appointment.error.js';
import { AppointmentNotFoundError } from '../../../appointments/domain/errors/appointment-not-found.error.js';
import type { ServiceDto } from '../../../services/application/dtos/service.dto.js';
import { ListServicesUseCase } from '../../../services/application/use-cases/list-services.use-case.js';
import { LLM_PORT } from '../../domain/ports/llm.port.js';
import type { LlmPort, LlmTool, LlmToolCall } from '../../domain/ports/llm.port.js';
import type { AssistantCommandInput, AssistantResult } from '../dtos/assistant.dto.js';

const TOOLS: LlmTool[] = [
  {
    name: 'create_appointment',
    description: 'Create a new appointment for a client.',
    parameters: {
      type: 'object',
      properties: {
        client: { type: 'string', description: 'Client full name' },
        service: { type: 'string', description: 'Exact service name from the catalog' },
        date: { type: 'string', description: 'ISO date YYYY-MM-DD' },
        time: { type: 'string', description: '24h time HH:mm' },
      },
      required: ['client', 'service', 'date', 'time'],
    },
  },
  {
    name: 'list_appointments',
    description: 'List appointments, optionally for one date.',
    parameters: {
      type: 'object',
      properties: { date: { type: 'string', description: 'ISO date YYYY-MM-DD' } },
    },
  },
  {
    name: 'cancel_appointment',
    description: 'Cancel an existing appointment by its id.',
    parameters: {
      type: 'object',
      properties: { appointmentId: { type: 'number' } },
      required: ['appointmentId'],
    },
  },
];

/** Narrows an untyped LLM argument to a string. */
function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

@Injectable()
export class HandleVoiceCommandUseCase {
  constructor(
    @Inject(LLM_PORT) private readonly llm: LlmPort,
    private readonly listAppointments: ListAppointmentsUseCase,
    private readonly scheduleAppointment: ScheduleAppointmentUseCase,
    private readonly updateStatus: UpdateAppointmentStatusUseCase,
    private readonly listServices: ListServicesUseCase,
  ) {}

  async execute(input: AssistantCommandInput): Promise<AssistantResult> {
    if (input.confirmCancelId !== undefined) {
      return this.cancel(input.confirmCancelId);
    }
    const text = (input.text ?? '').trim();
    if (!text) {
      return { reply: 'No te he escuchado, ¿puedes repetirlo?', action: 'none' };
    }

    const existing = await this.listAppointments.execute();
    const services = await this.listServices.execute();
    const response = await this.llm.complete({
      system: this.buildSystemPrompt(existing, services),
      user: text,
      tools: TOOLS,
    });

    const call = response.toolCalls[0];
    if (!call) {
      return { reply: response.text ?? 'No he entendido el comando.', action: 'none' };
    }
    return this.run(call, existing, services);
  }

  private async run(
    call: LlmToolCall,
    existing: AppointmentDto[],
    services: ServiceDto[],
  ): Promise<AssistantResult> {
    const args = call.arguments;
    try {
      switch (call.name) {
        case 'create_appointment': {
          const service = services.find(
            (s) => s.name.toLowerCase() === asString(args['service'], '').toLowerCase(),
          );
          if (!service) {
            return { reply: `No conozco ese servicio. Disponibles: ${services.map((s) => s.name).join(', ')}.`, action: 'none' };
          }
          const appointment = await this.scheduleAppointment.execute({
            client: asString(args['client'], ''),
            service: service.name,
            date: asString(args['date'], ''),
            time: asString(args['time'], ''),
            serviceCost: service.price,
            extras: [],
          });
          return {
            reply: `Cita creada para ${appointment.client} el ${appointment.date} a las ${appointment.time}.`,
            action: 'appointment_created',
            appointment,
          };
        }
        case 'list_appointments': {
          const date = asString(args['date'], '') || null;
          const appointments = existing.filter((a) => !date || a.date === date);
          return {
            reply: appointments.length ? `Hay ${appointments.length} citas.` : 'No hay citas.',
            action: 'appointments_listed',
            appointments,
          };
        }
        case 'cancel_appointment': {
          const id = Number(args['appointmentId']);
          const target = existing.find((a) => a.id === id);
          if (!target) {
            return { reply: 'No encuentro esa cita.', action: 'none' };
          }
          return {
            reply: `¿Seguro que quieres cancelar la cita de ${target.client} el ${target.date} a las ${target.time}?`,
            action: 'needs_confirmation',
            pendingCancelId: id,
          };
        }
        default:
          return { reply: 'No he entendido el comando.', action: 'none' };
      }
    } catch (error) {
      if (error instanceof AppointmentConflictError) {
        return { reply: 'Ese horario ya está ocupado. Elige otra hora.', action: 'none' };
      }
      if (error instanceof InvalidAppointmentError || error instanceof AppointmentNotFoundError) {
        return { reply: error.message, action: 'none' };
      }
      throw error;
    }
  }

  private async cancel(id: number): Promise<AssistantResult> {
    try {
      const appointment = await this.updateStatus.execute(id, 'cancelled');
      return { reply: 'Cita cancelada.', action: 'appointment_cancelled', appointment };
    } catch (error) {
      if (error instanceof AppointmentNotFoundError) {
        return { reply: error.message, action: 'none' };
      }
      throw error;
    }
  }

  private buildSystemPrompt(existing: AppointmentDto[], services: ServiceDto[]): string {
    const today = new Date().toISOString().slice(0, 10);
    const active = existing
      .filter((a) => a.status !== 'cancelled' && a.status !== 'completed')
      .map((a) => `#${a.id} ${a.client} ${a.date} ${a.time} (${a.service})`)
      .join('\n');
    return [
      'You are the voice assistant of a barbershop. The user speaks Spanish. Always call exactly one tool when the request matches one; otherwise answer briefly in Spanish.',
      `Today is ${today}. Resolve relative dates ("mañana", "el viernes") to ISO dates.`,
      `Services: ${services.map((s) => s.name).join(', ') || '(none configured)'}.`,
      `Active appointments:\n${active || '(none)'}`,
    ].join('\n');
  }
}
