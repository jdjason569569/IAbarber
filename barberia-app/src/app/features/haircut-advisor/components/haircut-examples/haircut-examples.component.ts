import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { imageOutline } from 'ionicons/icons';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

/** Example pictures of a cut from the shop's catalog, scrolled sideways; a placeholder when there are none. */
@Component({
  selector: 'app-haircut-examples',
  templateUrl: 'haircut-examples.component.html',
  styleUrls: ['haircut-examples.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class HaircutExamplesComponent {
  readonly images = input.required<string[]>();
  /** Cut name, for the alt text. */
  readonly name = input.required<string>();

  constructor() {
    addIcons({ imageOutline });
  }
}
