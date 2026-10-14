import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { StatisticsService } from '../services/statistics.service';

@Component({
  selector: 'app-statistics',
  templateUrl: 'statistics.page.html',
  styleUrls: ['statistics.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule],
})
export class StatisticsPage {
  protected readonly stats = inject(StatisticsService).getStatistics();
}
