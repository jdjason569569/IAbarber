import type { MessageKey } from '../../../core/i18n/messages.es';

/** One card of the welcome tutorial. */
export interface OnboardingSlide {
  icon: string;
  title: MessageKey;
  text: MessageKey;
}
