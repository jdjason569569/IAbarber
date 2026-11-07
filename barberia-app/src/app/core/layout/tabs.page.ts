import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { addIcons } from 'ionicons';
import { calendarOutline, cutOutline, settingsOutline, statsChartOutline } from 'ionicons/icons';
import { APP_VERSION } from '../config/app-version';
import { AuthService } from '../auth/auth.service';
import type { MessageKey } from '../i18n/messages.es';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrl: 'tabs.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class TabsPage {
  protected readonly version = APP_VERSION;
  private readonly auth = inject(AuthService);
  /** Shown next to the version so the barber always knows which space (admin or guest demo) is open. */
  protected readonly roleKey = computed(
    (): MessageKey => (this.auth.isGuest() ? 'auth.role.guest' : 'auth.role.admin'),
  );

  constructor() {
    addIcons({ calendarOutline, cutOutline, settingsOutline, statsChartOutline });
  }
}
