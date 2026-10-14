import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { calendarOutline, statsChartOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule],
})
export class TabsPage {
  constructor() {
    addIcons({ calendarOutline, statsChartOutline });
  }
}
