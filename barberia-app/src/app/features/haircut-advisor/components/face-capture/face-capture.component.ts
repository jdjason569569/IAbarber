import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { cameraOutline, personCircleOutline } from 'ionicons/icons';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

/** Shows the client's photo (or a placeholder) and the button to take it. */
@Component({
  selector: 'app-face-capture',
  templateUrl: 'face-capture.component.html',
  styleUrls: ['face-capture.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class FaceCaptureComponent {
  /** Data URL of the photo, or `null` before the first one. */
  readonly photo = input<string | null>(null);
  readonly busy = input(false);
  readonly capture = output<void>();

  constructor() {
    addIcons({ cameraOutline, personCircleOutline });
  }
}
