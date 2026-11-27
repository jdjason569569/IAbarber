import { ChangeDetectionStrategy, Component, ElementRef, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/auth/auth.service';
import { Tilt3dDirective } from '../../../shared/directives/tilt-3d.directive';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { replayStagger } from '../../../shared/utils/stagger.util';
import { BarberNameEditorComponent } from '../components/barber-name-editor/barber-name-editor.component';
import { BookingLinkCardComponent } from '../components/booking-link-card/booking-link-card.component';
import { DayBlocksEditorComponent } from '../components/day-blocks-editor/day-blocks-editor.component';
import { ServicePriceEditorComponent } from '../components/service-price-editor/service-price-editor.component';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonicModule,
    TranslatePipe,
    Tilt3dDirective,
    BarberNameEditorComponent,
    BookingLinkCardComponent,
    DayBlocksEditorComponent,
    ServicePriceEditorComponent,
  ],
})
export class SettingsPage {
  private readonly auth = inject(AuthService);
  private readonly host: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;

  constructor() {
    addIcons({ logOutOutline });
  }

  /** Ionic hook: the sections slide in every time the tab is shown. */
  ionViewWillEnter(): void {
    replayStagger(this.host);
  }

  protected signOut(): Promise<void> {
    return this.auth.leaveToLogin();
  }
}
