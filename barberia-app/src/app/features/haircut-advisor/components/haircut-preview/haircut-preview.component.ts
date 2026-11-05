import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { refreshOutline, sparklesOutline } from 'ionicons/icons';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MessageKey } from '../../../../core/i18n/messages.es';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { HaircutPreviewState } from '../../models/haircut-preview.model';

/** Button to draw the client with the cut, then the picture (or a spinner, or the error with retry). */
@Component({
  selector: 'app-haircut-preview',
  templateUrl: 'haircut-preview.component.html',
  styleUrls: ['haircut-preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class HaircutPreviewComponent {
  private readonly i18n = inject(I18nService);

  /** `null` until the barber asks for the picture of this cut. */
  readonly state = input<HaircutPreviewState | null>(null);
  /** Cut name, for the alt text. */
  readonly name = input.required<string>();
  readonly generate = output<void>();

  protected readonly errorMessage = computed(() => {
    const state = this.state();
    return state?.status === 'error'
      ? this.i18n.t(`haircutAdvisor.preview.errors.${state.code}` satisfies MessageKey)
      : null;
  });

  constructor() {
    addIcons({ sparklesOutline, refreshOutline });
  }
}
