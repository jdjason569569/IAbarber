import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ShopSettingsModule } from '../shop-settings/shop-settings.module.js';
import { HandleIncomingWhatsappMessageUseCase } from './application/use-cases/handle-incoming-whatsapp-message.use-case.js';
import { ReplyToClientMessageUseCase } from './application/use-cases/reply-to-client-message.use-case.js';
import { CLIENT_ACTIVITY_REPOSITORY } from './domain/ports/client-activity.repository.js';
import { HANDOFF_REPOSITORY } from './domain/ports/handoff.repository.js';
import { WHATSAPP_MESSENGER } from './domain/ports/whatsapp-messenger.port.js';
import { MetaCloudWhatsappMessenger } from './infrastructure/external/meta-cloud-whatsapp-messenger.js';
import { InMemoryClientActivityRepository } from './infrastructure/persistence/in-memory-client-activity.repository.js';
import { InMemoryHandoffRepository } from './infrastructure/persistence/in-memory-handoff.repository.js';
import { WhatsappWebhookController } from './infrastructure/http/whatsapp-webhook.controller.js';
import { WhatsappController } from './infrastructure/http/whatsapp.controller.js';

@Module({
  imports: [AppointmentsModule, NotificationsModule, ShopSettingsModule],
  controllers: [WhatsappController, WhatsappWebhookController],
  providers: [
    ReplyToClientMessageUseCase,
    HandleIncomingWhatsappMessageUseCase,
    { provide: WHATSAPP_MESSENGER, useClass: MetaCloudWhatsappMessenger },
    { provide: HANDOFF_REPOSITORY, useClass: InMemoryHandoffRepository },
    { provide: CLIENT_ACTIVITY_REPOSITORY, useClass: InMemoryClientActivityRepository },
  ],
})
export class WhatsappModule {}
