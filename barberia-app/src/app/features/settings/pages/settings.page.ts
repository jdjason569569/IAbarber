import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertController, IonicModule } from '@ionic/angular/lazy';
import { addIcons } from 'ionicons';
import { trashOutline } from 'ionicons/icons';
import { I18nService } from '../../../core/i18n/i18n.service';
import { MessageKey } from '../../../core/i18n/messages.es';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ShopService } from '../models/shop-service.model';
import { ShopServiceService } from '../services/shop-service.service';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, ReactiveFormsModule, TranslatePipe],
})
export class SettingsPage {
  private readonly shopServices = inject(ShopServiceService);
  private readonly alertController = inject(AlertController);
  private readonly i18n = inject(I18nService);

  protected readonly services = signal<ShopService[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(60)],
    }),
    price: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(100000),
    ]),
  });

  constructor() {
    addIcons({ trashOutline });
  }

  /** Ionic hook: reload every time the tab is shown. */
  ionViewWillEnter(): void {
    this.loading.set(true);
    this.shopServices.list().subscribe({
      next: (items) => {
        this.services.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.i18n.t('settings.loadError'));
        this.loading.set(false);
      },
    });
  }

  protected add(): void {
    const { name, price } = this.form.getRawValue();
    if (this.form.invalid || price === null || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.shopServices.add({ name: name.trim(), price: Number(price) }).subscribe({
      next: (created) => {
        this.services.update((items) => [...items, created]);
        this.form.reset({ name: '', price: null });
        this.saving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.messageFrom(err));
        this.saving.set(false);
      },
    });
  }

  protected async confirmRemove(service: ShopService): Promise<void> {
    const alert = await this.alertController.create({
      header: this.i18n.t('settings.deleteTitle'),
      message: this.i18n.t('settings.deleteMessage', { name: service.name }),
      buttons: [
        { text: this.i18n.t('settings.cancel'), role: 'cancel' },
        {
          text: this.i18n.t('settings.delete'),
          role: 'destructive',
          handler: () => this.remove(service),
        },
      ],
    });
    await alert.present();
  }

  private remove(service: ShopService): void {
    this.error.set(null);
    this.shopServices.remove(service.id).subscribe({
      next: () => this.services.update((items) => items.filter((s) => s.id !== service.id)),
      error: (err: HttpErrorResponse) => this.error.set(this.messageFrom(err)),
    });
  }

  /** Maps the API status to a translated message; API texts are never shown to the user. */
  private messageFrom(err: HttpErrorResponse): string {
    const key: MessageKey = (() => {
      switch (err.status) {
        case 400: return 'settings.errors.invalid';
        case 404: return 'settings.errors.notFound';
        case 409: return 'settings.errors.duplicate';
        default: return 'settings.errors.server';
      }
    })();
    return this.i18n.t(key);
  }
}
