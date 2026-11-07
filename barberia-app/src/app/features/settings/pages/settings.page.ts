import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';
import { AuthService } from '../../../core/auth/auth.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { DayBlocksEditorComponent } from '../components/day-blocks-editor/day-blocks-editor.component';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe, DayBlocksEditorComponent],
})
export class SettingsPage {
  private readonly auth = inject(AuthService);

  constructor() {
    addIcons({ logOutOutline });
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    // Full reload so no data of this session stays cached in memory.
    window.location.replace('/login');
  }
}
