import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { checkmark, paperPlane } from 'ionicons/icons';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

/** Shows how far an answer to the assistant has been sent (0-100); turns green when complete. */
@Component({
  selector: 'app-send-progress',
  templateUrl: 'send-progress.component.html',
  styleUrls: ['send-progress.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class SendProgressComponent {
  readonly progress = input.required<number>();

  constructor() {
    addIcons({ checkmark, paperPlane });
  }
}
