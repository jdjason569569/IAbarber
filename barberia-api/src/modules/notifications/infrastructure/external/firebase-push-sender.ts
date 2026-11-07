import { Injectable } from '@nestjs/common';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import type { App, ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { PushMessage, PushSender, PushSendResult } from '../../domain/ports/push-sender.port.js';

/** FCM accepts up to 500 tokens per multicast call. */
const BATCH_SIZE = 500;

/** Error codes meaning the token will never work again (app uninstalled, token rotated or malformed). */
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

/** Android channel created by the app; pushes on it use high importance (heads-up with sound). */
const ANDROID_CHANNEL_ID = 'bookings';

/** True when the Firebase service account is configured (base64 of the JSON key). */
export const isFirebaseConfigured = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);

/** Sends pushes through Firebase Cloud Messaging with the Admin SDK. */
@Injectable()
export class FirebasePushSender implements PushSender {
  private app?: App;

  async send(tokens: string[], message: PushMessage): Promise<PushSendResult> {
    const messaging = getMessaging(this.firebaseApp());
    const invalidTokens: string[] = [];
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);
      const result = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title: message.title, body: message.body },
        data: message.data,
        android: { priority: 'high', notification: { channelId: ANDROID_CHANNEL_ID, sound: 'default' } },
      });
      result.responses.forEach((response, index) => {
        if (response.success) return;
        if (response.error && isDeadToken(response.error.code, response.error.message)) {
          invalidTokens.push(batch[index]);
        } else {
          console.error('Push to one device failed:', response.error?.message);
        }
      });
    }
    return { invalidTokens };
  }

  /** Initialized on first use, so a bad key only breaks the pushes and not the API start. */
  private firebaseApp(): App {
    if (this.app) return this.app;
    const encoded = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!encoded) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
    }
    const account = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as ServiceAccount;
    this.app = getApps()[0] ?? initializeApp({ credential: cert(account) });
    return this.app;
  }
}

function isDeadToken(code: string, message: string): boolean {
  // A malformed token comes back as a generic invalid-argument error that names the token.
  return DEAD_TOKEN_CODES.has(code) || (code === 'messaging/invalid-argument' && /registration token/i.test(message));
}
