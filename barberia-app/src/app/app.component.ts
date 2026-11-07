import { Component, inject } from '@angular/core';
import { PushNotificationsService } from './core/notifications/push-notifications.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor() {
    // Starts push notifications for the admin session (native app only).
    inject(PushNotificationsService);
  }
}
