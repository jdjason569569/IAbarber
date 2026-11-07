export const PUSH_SENDER = Symbol('PUSH_SENDER');

export interface PushMessage {
  title: string;
  body: string;
  /** Extra key/value pairs the app reads when the notification is opened. */
  data?: Record<string, string>;
}

export interface PushSendResult {
  /** Tokens the push service rejected for good (app uninstalled, token expired); delete them. */
  invalidTokens: string[];
}

/** Sends a push notification to a set of devices. */
export interface PushSender {
  send(tokens: string[], message: PushMessage): Promise<PushSendResult>;
}
