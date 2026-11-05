import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { MessageKey } from '../../../../core/i18n/messages.es';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { FaceShapeResult } from '../../models/face-shape.model';
import { HairAnalysis } from '../../models/haircut.model';

/** Detected face shape, how sure the detection is, the runner-up shape and the hair seen by Gemini. */
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
  /** `null` when the API fell back to the face proportions. */
  readonly hair = input<HairAnalysis | null>(null);

  protected readonly hairType = computed(() => {
    const hair = this.hair();
    return hair
      ? this.i18n.t(
          `haircutAdvisor.hair.types.${hair.type}` satisfies MessageKey,
        )
      : null;
  });

  protected readonly shapeName = computed(() =>
    this.i18n.t(
      `haircutAdvisor.shapes.${this.result().shape}.name` satisfies MessageKey,
    ),
  );
  protected readonly advice = computed(() =>
    this.i18n.t(
      `haircutAdvisor.shapes.${this.result().shape}.advice` satisfies MessageKey,
    ),
  );
  protected readonly confidence = computed(() =>
    Math.round(this.result().confidence * 100),
  );
  /** Second most likely shape, shown only when it is close to the first. */
  protected readonly alternative = computed(() => {
    const second = this.result().ranking[1];
    return second && second.probability >= 0.2
      ? this.i18n.t(
          `haircutAdvisor.shapes.${second.shape}.name` satisfies MessageKey,
        )
      : null;
  });
}
