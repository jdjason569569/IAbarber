import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { firstValueFrom } from 'rxjs';
import { CameraService } from '../../../core/camera/camera.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MessageKey } from '../../../core/i18n/messages.es';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { FaceCaptureComponent } from '../components/face-capture/face-capture.component';
import { FaceShapeResultComponent } from '../components/face-shape-result/face-shape-result.component';
import { HaircutExamplesComponent } from '../components/haircut-examples/haircut-examples.component';
import { FaceAnalysisError } from '../models/face-metrics.model';
import { FaceShapeResult } from '../models/face-shape.model';
import { HaircutRecommendation } from '../models/haircut.model';
import { FaceAnalysisService } from '../services/face-analysis.service';
import { HaircutRecommendationService } from '../services/haircut-recommendation.service';

/**
 * The barber photographs the client; the face is measured on the phone and the API returns the
 * face shape and the recommended cuts with example pictures. The photo never leaves the device.
 */
@Component({
  selector: 'app-haircut-advisor',
  templateUrl: 'haircut-advisor.page.html',
  styleUrls: ['haircut-advisor.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe, FaceCaptureComponent, FaceShapeResultComponent, HaircutExamplesComponent],
})
export class HaircutAdvisorPage {
  private readonly camera = inject(CameraService);
  private readonly faceAnalysis = inject(FaceAnalysisService);
  private readonly recommendations = inject(HaircutRecommendationService);
  private readonly i18n = inject(I18nService);

  protected readonly photo = signal<string | null>(null);
  protected readonly analyzing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly faceShape = signal<FaceShapeResult | null>(null);
  protected readonly recommended = signal<HaircutRecommendation[]>([]);
  protected readonly selectedId = signal<string | null>(null);

  protected readonly selected = computed(
    () => this.recommended().find((r) => r.id === this.selectedId()) ?? this.recommended()[0] ?? null,
  );

  protected matchPercent(recommendation: HaircutRecommendation): number {
    return Math.round(recommendation.score * 100);
  }

  protected selectCut(id: string): void {
    this.selectedId.set(id);
  }

  protected async capture(): Promise<void> {
    this.error.set(null);
    let photo: string | null;
    try {
      photo = await this.camera.takePhoto({
        header: this.i18n.t('haircutAdvisor.capture.promptHeader'),
        photo: this.i18n.t('haircutAdvisor.capture.promptGallery'),
        picture: this.i18n.t('haircutAdvisor.capture.promptCamera'),
        cancel: this.i18n.t('haircutAdvisor.capture.promptCancel'),
      });
    } catch (error) {
      console.error('Camera failed', error);
      this.error.set(this.i18n.t('haircutAdvisor.errors.camera'));
      return;
    }
    if (!photo) {
      return;
    }
    this.photo.set(photo);
    await this.analyze(photo);
  }

  private async analyze(photo: string): Promise<void> {
    this.analyzing.set(true);
    this.faceShape.set(null);
    this.recommended.set([]);
    this.selectedId.set(null);
    try {
      const analysis = await this.faceAnalysis.analyze(photo);
      const result = await firstValueFrom(this.recommendations.recommend(analysis.metrics));
      // A new photo may have been taken while this one was being analyzed.
      if (this.photo() !== photo) {
        return;
      }
      this.faceShape.set(result.faceShape);
      this.recommended.set(result.recommendations);
    } catch (error) {
      if (!(error instanceof FaceAnalysisError)) {
        console.error('Haircut recommendation failed', error);
      }
      const code = error instanceof FaceAnalysisError ? error.code : 'network';
      this.error.set(this.i18n.t(`haircutAdvisor.errors.${code}` satisfies MessageKey));
    } finally {
      this.analyzing.set(false);
    }
  }
}
