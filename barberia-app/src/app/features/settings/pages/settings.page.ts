import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { DayBlocksEditorComponent } from '../components/day-blocks-editor/day-blocks-editor.component';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe, DayBlocksEditorComponent],
})
export class SettingsPage {}
