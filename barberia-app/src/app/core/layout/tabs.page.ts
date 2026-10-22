import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { addIcons } from 'ionicons';
import { calendarOutline, settingsOutline, statsChartOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class TabsPage {
  constructor() {
    addIcons({ calendarOutline, settingsOutline, statsChartOutline });
  }
}
