import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MessageKey } from '../../../../core/i18n/messages.es';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { FaceShapeResult } from '../../models/face-shape.model';

/** Detected face shape, how sure the detection is and the runner-up shape. */
@Component({
  selector: 'app-face-shape-result',
  templateUrl: 'face-shape-result.component.html',
  styleUrls: ['face-shape-result.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class FaceShapeResultComponent {
  private readonly i18n = inject(I18nService);

  readonly result = input.required<FaceShapeResult>();

  protected readonly shapeName = computed(() =>
    this.i18n.t(`haircutAdvisor.shapes.${this.result().shape}.name` satisfies MessageKey),
  );
  protected readonly advice = computed(() =>
    this.i18n.t(`haircutAdvisor.shapes.${this.result().shape}.advice` satisfies MessageKey),
  );
  protected readonly confidence = computed(() => Math.round(this.result().confidence * 100));
  /** Second most likely shape, shown only when it is close to the first. */
  protected readonly alternative = computed(() => {
    const second = this.result().ranking[1];
    return second && second.probability >= 0.2
      ? this.i18n.t(`haircutAdvisor.shapes.${second.shape}.name` satisfies MessageKey)
      : null;
  });
}
