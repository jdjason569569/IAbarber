import type { OnboardingSlide } from '../models/onboarding-slide.model';

export const ONBOARDING_SLIDES: readonly OnboardingSlide[] = [
  { icon: 'cut-outline', title: 'onboarding.welcome.title', text: 'onboarding.welcome.text' },
  { icon: 'mic-outline', title: 'onboarding.book.title', text: 'onboarding.book.text' },
  { icon: 'calendar-outline', title: 'onboarding.manage.title', text: 'onboarding.manage.text' },
  { icon: 'stats-chart-outline', title: 'onboarding.statistics.title', text: 'onboarding.statistics.text' },
  { icon: 'settings-outline', title: 'onboarding.settings.title', text: 'onboarding.settings.text' },
  { icon: 'checkmark-circle-outline', title: 'onboarding.ready.title', text: 'onboarding.ready.text' },
];
