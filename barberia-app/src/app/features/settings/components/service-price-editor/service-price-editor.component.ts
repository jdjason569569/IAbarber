import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ShopSettingsService } from '../../services/shop-settings.service';

/** Highest price accepted by the API. */
const MAX_PRICE = 10_000_000;

/** "Valor del servicio": the price WhatsApp bookings are created with. */
@Component({
  selector: 'app-service-price-editor',
  templateUrl: 'service-price-editor.component.html',
  styleUrl: 'service-price-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, TranslatePipe],
})
export class ServicePriceEditorComponent implements OnInit {
  private readonly settings = inject(ShopSettingsService);
  private readonly i18n = inject(I18nService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  /** Saved value, to know when the field changed. */
  private readonly saved = signal(0);
  /** What the barber typed, digits only. */
  protected readonly typed = signal('');
  protected readonly message = signal<{ text: string; error: boolean } | null>(null);

  protected readonly price = computed(() => Number(this.typed() || '0'));
  protected readonly valid = computed(() => /^\d+$/.test(this.typed()) && this.price() <= MAX_PRICE);
  protected readonly dirty = computed(() => this.price() !== this.saved());
  /** "$20.000", shown under the field so a missing or extra zero is easy to spot. */
  protected readonly preview = computed(() => `$${this.price().toLocaleString(this.i18n.locale)}`);

  ngOnInit(): void {
    this.loading.set(true);
    this.settings.getServicePrice().subscribe({
      next: (price) => {
        this.saved.set(price);
        this.typed.set(price ? String(price) : '');
        this.loading.set(false);
      },
      error: () => {
        this.message.set({ text: this.i18n.t('settings.price.loadError'), error: true });
        this.loading.set(false);
      },
    });
  }

  protected onInput(value: string | null | undefined): void {
    // Thousands separators or "$" typed by habit are dropped: only the digits count.
    this.typed.set((value ?? '').replace(/\D/g, ''));
    this.message.set(null);
  }

  protected save(): void {
    if (!this.valid() || this.saving()) return;
    this.saving.set(true);
    this.settings.saveServicePrice(this.price()).subscribe({
      next: (price) => {
        this.saved.set(price);
        this.saving.set(false);
        this.message.set({ text: this.i18n.t('settings.price.saved'), error: false });
      },
      error: () => {
        this.saving.set(false);
        this.message.set({ text: this.i18n.t('settings.errors.server'), error: true });
      },
    });
  }
}
