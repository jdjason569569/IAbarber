import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { BusinessHoursModule } from '../business-hours/business-hours.module.js';
import { HandleBookingTurnUseCase } from './application/use-cases/handle-booking-turn.use-case.js';
import { HandleVoiceCommandUseCase } from './application/use-cases/handle-voice-command.use-case.js';
import { LLM_PORT } from './domain/ports/llm.port.js';
import { AssistantController } from './infrastructure/http/assistant.controller.js';
import { GeminiLlmAdapter } from './infrastructure/llm/gemini-llm.adapter.js';

@Module({
  imports: [AppointmentsModule, BusinessHoursModule],
  controllers: [AssistantController],
  providers: [HandleVoiceCommandUseCase, HandleBookingTurnUseCase, { provide: LLM_PORT, useClass: GeminiLlmAdapter }],
})
export class AssistantModule {}
