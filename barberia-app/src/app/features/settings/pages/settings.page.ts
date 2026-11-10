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

  protected signOut(): Promise<void> {
    return this.auth.leaveToLogin();
  }
}
