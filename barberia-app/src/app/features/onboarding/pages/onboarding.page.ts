import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  checkmarkCircleOutline,
  cutOutline,
  micOutline,
  settingsOutline,
  statsChartOutline,
} from 'ionicons/icons';
import { OnboardingService } from '../../../core/onboarding/onboarding.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ONBOARDING_SLIDES } from '../data/onboarding-slides';

/** Welcome tutorial shown once, the first time the app opens: cards the user swipes through. */
@Component({
  selector: 'app-onboarding',
  templateUrl: 'onboarding.page.html',
  styleUrl: 'onboarding.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class OnboardingPage {
  private readonly onboarding = inject(OnboardingService);
  private readonly router = inject(Router);
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  protected readonly slides = ONBOARDING_SLIDES;
  protected readonly current = signal(0);
  protected readonly isLast = computed(() => this.current() === this.slides.length - 1);

  constructor() {
    addIcons({
      calendarOutline,
      checkmarkCircleOutline,
      cutOutline,
      micOutline,
      settingsOutline,
      statsChartOutline,
    });
  }

  /** Keeps the dots in sync while the user swipes. */
  protected onScroll(): void {
    const el = this.track().nativeElement;
    if (el.clientWidth === 0) return;
    this.current.set(Math.round(el.scrollLeft / el.clientWidth));
  }

  protected goTo(index: number): void {
    const el = this.track().nativeElement;
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
  }

  protected next(): void {
    if (this.isLast()) {
      this.finish();
    } else {
      this.goTo(this.current() + 1);
    }
  }

  protected finish(): void {
    this.onboarding.markSeen();
    void this.router.navigateByUrl('/', { replaceUrl: true });
  }
}
