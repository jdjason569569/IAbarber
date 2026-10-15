import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular/lazy';
import { Appointment } from '../models/appointment.model';
import { AppointmentService } from '../services/appointment.service';

@Component({
  selector: 'app-appointment-list',
  templateUrl: 'appointment-list.page.html',
  styleUrls: ['appointment-list.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule],
})
export class AppointmentListPage {
  private readonly appointmentService = inject(AppointmentService);

  protected readonly filters = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];
  protected readonly selectedFilter = signal('all');
  private readonly appointments = signal(this.appointmentService.getAppointments());

  protected readonly visibleAppointments = computed(() => {
    const filter = this.selectedFilter();
    return this.appointments().filter((a) => filter === 'all' || a.status === filter);
  });

  protected total(appointment: Appointment): number {
    return this.appointmentService.getTotal(appointment);
  }

  protected statusColor(status: string): string {
    switch (status) {
      case 'confirmed': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'warning';
    }
  }

  protected onFilterChange(value: string | number | undefined): void {
    this.selectedFilter.set(String(value ?? 'all'));
  }
}
