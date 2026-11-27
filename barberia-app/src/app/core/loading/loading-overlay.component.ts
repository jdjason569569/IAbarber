import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LoadingService } from './loading.service';

/** Requests shorter than this never show the overlay, so fast answers do not flicker. */
const SHOW_DELAY_MS = 250;

/** Full-screen dimmed layer with scissors cutting back and forth while an API request is in flight. */
@Component({
  selector: 'app-loading-overlay',
  templateUrl: 'loading-overlay.component.html',
  styleUrls: ['loading-overlay.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
})
export class LoadingOverlayComponent {
  private readonly loading = inject(LoadingService);
  protected readonly visible = signal(false);

  constructor() {
    effect((onCleanup) => {
      if (!this.loading.active()) {
        this.visible.set(false);
        return;
      }
      const timer = setTimeout(() => this.visible.set(true), SHOW_DELAY_MS);
      onCleanup(() => clearTimeout(timer));
    });
  }
}
