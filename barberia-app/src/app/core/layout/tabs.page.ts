import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { addIcons } from 'ionicons';
import { calendarOutline, cutOutline, settingsOutline, statsChartOutline } from 'ionicons/icons';
import { APP_VERSION } from '../config/app-version';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrl: 'tabs.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class TabsPage {
  protected readonly version = APP_VERSION;

  constructor() {
    addIcons({ calendarOutline, cutOutline, settingsOutline, statsChartOutline });
  }
}
