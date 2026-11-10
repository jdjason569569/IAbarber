import { Module } from '@nestjs/common';
import { isSupabaseConfigured } from '../../shared/supabase/supabase.provider.js';
import { NotifyNewBookingUseCase } from './application/use-cases/notify-new-booking.use-case.js';
import { NotifyTalkRequestUseCase } from './application/use-cases/notify-talk-request.use-case.js';
import { RegisterDeviceUseCase } from './application/use-cases/register-device.use-case.js';
import { UnregisterDeviceUseCase } from './application/use-cases/unregister-device.use-case.js';
import { DEVICE_TOKEN_REPOSITORY } from './domain/ports/device-token.repository.js';
import { PUSH_SENDER } from './domain/ports/push-sender.port.js';
import { DisabledPushSender } from './infrastructure/external/disabled-push-sender.js';
import { FirebasePushSender, isFirebaseConfigured } from './infrastructure/external/firebase-push-sender.js';
import { NotificationsController } from './infrastructure/http/notifications.controller.js';
import { InMemoryDeviceTokenRepository } from './infrastructure/persistence/in-memory-device-token.repository.js';
import { SupabaseDeviceTokenRepository } from './infrastructure/persistence/supabase-device-token.repository.js';

// Pushes go through Firebase when FIREBASE_SERVICE_ACCOUNT is set; otherwise they are only logged.
@Module({
  controllers: [NotificationsController],
  providers: [
    RegisterDeviceUseCase,
    UnregisterDeviceUseCase,
    NotifyNewBookingUseCase,
    NotifyTalkRequestUseCase,
    {
      provide: DEVICE_TOKEN_REPOSITORY,
      useClass: isSupabaseConfigured ? SupabaseDeviceTokenRepository : InMemoryDeviceTokenRepository,
    },
    { provide: PUSH_SENDER, useClass: isFirebaseConfigured ? FirebasePushSender : DisabledPushSender },
  ],
  exports: [NotifyNewBookingUseCase, NotifyTalkRequestUseCase],
})
export class NotificationsModule {}
