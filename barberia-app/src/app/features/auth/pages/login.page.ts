import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { AuthService } from '../../../core/auth/auth.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

/** Entry screen: the barber logs in as admin, or a visitor enters the guest demo. */
@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrl: 'login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, ReactiveFormsModule, TranslatePipe],
})
export class LoginPage {
  private readonly auth = inject(AuthService);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly signingIn = signal(false);
  protected readonly failed = signal(false);

  protected async signIn(): Promise<void> {
    if (this.form.invalid || this.signingIn()) return;
    this.signingIn.set(true);
    this.failed.set(false);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.signInAdmin(email.trim(), password);
      openApp();
    } catch {
      this.failed.set(true);
      this.signingIn.set(false);
    }
  }

  protected enterAsGuest(): void {
    this.auth.enterAsGuest();
    openApp();
  }
}

/** Full reload so no data cached by the previous session survives the role change. */
function openApp(): void {
  window.location.replace('/');
}
