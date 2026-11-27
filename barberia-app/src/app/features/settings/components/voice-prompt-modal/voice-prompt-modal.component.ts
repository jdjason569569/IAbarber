import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { alertCircle, checkmarkCircle, close, mic, sendOutline } from 'ionicons/icons';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { VoicePromptService } from '../../services/voice-prompt.service';

/**
 * Popup of a settings voice assistant. Shows the state of the `VoicePromptService` the parent
 * component provides, and lets the barber type the answer instead of speaking.
 */
@Component({
  selector: 'app-voice-prompt-modal',
  templateUrl: 'voice-prompt-modal.component.html',
  styleUrls: ['voice-prompt-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, FormsModule, TranslatePipe],
})
export class VoicePromptModalComponent {
  protected readonly assistant = inject(VoicePromptService);

  /** The answer is being saved: the microphone shows a spinner. */
  readonly busy = input(false);
  /** Examples of what the barber can say. */
  readonly example = input.required<string>();

  protected typed = '';

  constructor() {
    addIcons({ alertCircle, checkmarkCircle, close, mic, sendOutline });
    // Each new conversation starts with an empty field.
    effect(() => {
      if (!this.assistant.open()) this.typed = '';
    });
  }

  protected submitTyped(): void {
    const text = this.typed.trim();
    if (!text) return;
    this.typed = '';
    this.assistant.submit(text);
  }
}
