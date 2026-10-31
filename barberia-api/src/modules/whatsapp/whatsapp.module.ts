import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { ReplyToClientMessageUseCase } from './application/use-cases/reply-to-client-message.use-case.js';
import { WhatsappController } from './infrastructure/http/whatsapp.controller.js';

@Module({
  imports: [AppointmentsModule],
  controllers: [WhatsappController],
  providers: [ReplyToClientMessageUseCase],
})
export class WhatsappModule {}
