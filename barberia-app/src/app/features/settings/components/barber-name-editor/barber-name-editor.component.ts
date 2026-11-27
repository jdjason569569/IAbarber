import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ShopSettingsService } from '../../services/shop-settings.service';

/** Longest name accepted by the API. */
const MAX_NAME_LENGTH = 40;

/** "Tu nombre": what the 10- and 5-minute reminders call the barber ("¡Pilas Andrés! …"). */
@Component({
  selector: 'app-barber-name-editor',
  templateUrl: 'barber-name-editor.component.html',
  styleUrl: 'barber-name-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class BarberNameEditorComponent implements OnInit {
  private readonly settings = inject(ShopSettingsService);
  private readonly i18n = inject(I18nService);

  protected readonly maxLength = MAX_NAME_LENGTH;
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  /** Saved name, to know when the field changed. */
  private readonly saved = signal('');
  protected readonly typed = signal('');
  protected readonly message = signal<{ text: string; error: boolean } | null>(null);

  protected readonly name = computed(() => this.typed().trim().replace(/\s+/g, ' '));
  protected readonly dirty = computed(() => this.name() !== this.saved());
  /** One of the real reminder phrases, with the typed name, so the barber hears how it will sound. */
  protected readonly preview = computed(() =>
    this.name()
      ? this.i18n.t('settings.barberName.preview', { name: this.name() })
      : this.i18n.t('settings.barberName.previewNoName'),
  );

  ngOnInit(): void {
    this.loading.set(true);
    this.settings.getBarberName().subscribe({
      next: (name) => {
        this.saved.set(name);
        this.typed.set(name);
        this.loading.set(false);
      },
      error: () => {
        this.message.set({ text: this.i18n.t('settings.barberName.loadError'), error: true });
        this.loading.set(false);
      },
    });
  }

  protected onInput(value: string | null | undefined): void {
    this.typed.set(value ?? '');
    this.message.set(null);
  }

  protected save(): void {
    if (!this.dirty() || this.saving()) return;
    this.saving.set(true);
    this.settings.saveBarberName(this.name()).subscribe({
      next: (name) => {
        this.saved.set(name);
        this.typed.set(name);
        this.saving.set(false);
        this.message.set({ text: this.i18n.t('settings.barberName.saved'), error: false });
      },
      error: () => {
        this.saving.set(false);
        this.message.set({ text: this.i18n.t('settings.errors.server'), error: true });
      },
    });
  }
}
