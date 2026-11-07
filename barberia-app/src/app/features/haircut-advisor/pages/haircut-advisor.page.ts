import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { firstValueFrom } from 'rxjs';
import { CameraService } from '../../../core/camera/camera.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MessageKey } from '../../../core/i18n/messages.es';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { toJpegDataUrl } from '../../../shared/utils/image.util';
import { FaceCaptureComponent } from '../components/face-capture/face-capture.component';
import { FaceShapeResultComponent } from '../components/face-shape-result/face-shape-result.component';
import { HaircutExamplesComponent } from '../components/haircut-examples/haircut-examples.component';
import { HaircutPreviewComponent } from '../components/haircut-preview/haircut-preview.component';
import { FaceAnalysisError } from '../models/face-metrics.model';
import { FaceShapeResult } from '../models/face-shape.model';
import { HairAnalysis, HaircutRecommendation } from '../models/haircut.model';
import { HaircutPreviewErrorCode, HaircutPreviewState } from '../models/haircut-preview.model';
import { FaceAnalysisService } from '../services/face-analysis.service';
import { HaircutPreviewService } from '../services/haircut-preview.service';
import { HaircutRecommendationService } from '../services/haircut-recommendation.service';
import { BackToLoginButtonComponent } from '../../../core/auth/back-to-login-button.component';

/**
 * The barber photographs the client. The phone checks that the face is there and facing the camera
 * (MediaPipe), then the API asks Gemini for the face shape, the hair and the cuts of the catalog that
 * suit the client, with example pictures. The photo is not stored.
 */
@Component({
  selector: 'app-haircut-advisor',
  templateUrl: 'haircut-advisor.page.html',
  styleUrls: ['haircut-advisor.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonicModule,
    TranslatePipe,
    FaceCaptureComponent,
    FaceShapeResultComponent,
    HaircutExamplesComponent,
    HaircutPreviewComponent,
    BackToLoginButtonComponent,
  ],
})
export class HaircutAdvisorPage {
  private readonly camera = inject(CameraService);
  private readonly faceAnalysis = inject(FaceAnalysisService);
  private readonly recommendations = inject(HaircutRecommendationService);
  private readonly previews = inject(HaircutPreviewService);
  private readonly i18n = inject(I18nService);

  protected readonly photo = signal<string | null>(null);
  protected readonly analyzing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly faceShape = signal<FaceShapeResult | null>(null);
  protected readonly hair = signal<HairAnalysis | null>(null);
  protected readonly recommended = signal<HaircutRecommendation[]>([]);
  protected readonly selectedId = signal<string | null>(null);
  /** Pictures of the client with each cut, by cut id; cleared when a new photo is taken. */
  protected readonly previewStates = signal<Record<string, HaircutPreviewState>>({});
  /** The reduced JPEG sent to the API, reused for the pictures. */
  private uploadPhoto: string | null = null;

  protected readonly selected = computed(
    () =>
      this.recommended().find((r) => r.id === this.selectedId()) ??
      this.recommended()[0] ??
      null,
  );

  protected matchPercent(recommendation: HaircutRecommendation): number {
    return Math.round(recommendation.score * 100);
  }

  protected selectCut(id: string): void {
    this.selectedId.set(id);
  }

  /** Each picture costs a Gemini call, so it is generated only when the barber asks for it. */
  protected async generatePreview(haircutId: string): Promise<void> {
    const photo = this.uploadPhoto;
    if (!photo || this.previewStates()[haircutId]?.status === 'loading') {
      return;
    }
    this.setPreview(haircutId, { status: 'loading' });
    try {
      const image = await firstValueFrom(this.previews.generate(photo, haircutId));
      if (this.uploadPhoto === photo) {
        this.setPreview(haircutId, { status: 'ready', image });
      }
    } catch (code) {
      if (this.uploadPhoto === photo) {
        this.setPreview(haircutId, { status: 'error', code: code as HaircutPreviewErrorCode });
      }
    }
  }

  private setPreview(haircutId: string, state: HaircutPreviewState): void {
    this.previewStates.update((states) => ({ ...states, [haircutId]: state }));
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
    this.hair.set(null);
    this.recommended.set([]);
    this.selectedId.set(null);
    this.previewStates.set({});
    this.uploadPhoto = null;
    try {
      const analysis = await this.faceAnalysis.analyze(photo);
      const upload = await toJpegDataUrl(photo);
      const result = await firstValueFrom(
        this.recommendations.recommend(analysis.metrics, upload),
      );
      // A new photo may have been taken while this one was being analyzed.
      if (this.photo() !== photo) {
        return;
      }
      this.faceShape.set(result.faceShape);
      this.hair.set(result.hair);
      this.recommended.set(result.recommendations);
      this.uploadPhoto = upload;
    } catch (error) {
      if (!(error instanceof FaceAnalysisError)) {
        console.error('Haircut recommendation failed', error);
      }
      const code = error instanceof FaceAnalysisError ? error.code : 'network';
      this.error.set(
        this.i18n.t(`haircutAdvisor.errors.${code}` satisfies MessageKey),
      );
    } finally {
      this.analyzing.set(false);
    }
  }
}
