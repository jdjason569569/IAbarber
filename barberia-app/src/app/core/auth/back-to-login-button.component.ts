import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AuthService } from './auth.service';

/**
 * Back arrow at the start of every tab header, only for the guest: leaves the demo and returns to
 * the login screen. The admin never sees it; the admin session only ends with "Cerrar sesión" (settings).
 */
@Component({
  selector: 'app-back-to-login-button',
  template: `
    @if (auth.isGuest()) {
      <ion-buttons>
        <ion-button (click)="back()" [attr.aria-label]="'auth.back' | t">
          <ion-icon slot="icon-only" name="arrow-back-outline"></ion-icon>
        </ion-button>
      </ion-buttons>
    }
  `,
  // ion-toolbar only places its direct children, so the host takes the start slot.
  host: { slot: 'start' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class BackToLoginButtonComponent {
  protected readonly auth = inject(AuthService);

  constructor() {
    addIcons({ arrowBackOutline });
  }

  protected back(): Promise<void> {
    return this.auth.leaveToLogin();
  }
}
