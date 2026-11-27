import { Inject, Injectable } from '@nestjs/common';
import { localIsoDate } from '../../../../shared/utils/local-date.js';
import { WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';
import { APPOINTMENT_MINUTES } from '../../../appointments/domain/entities/appointment.entity.js';
import { ListAppointmentsUseCase } from '../../../appointments/application/use-cases/list-appointments.use-case.js';
import { GetBusinessHoursUseCase } from '../../../business-hours/application/use-cases/get-business-hours.use-case.js';
import { ListNotifiedWorkspacesUseCase } from '../../../notifications/application/use-cases/list-notified-workspaces.use-case.js';
import { NotifyOverdueAppointmentsUseCase } from '../../../notifications/application/use-cases/notify-overdue-appointments.use-case.js';
import { GetBarberNameUseCase } from '../../../shop-settings/application/use-cases/get-barber-name.use-case.js';
import { dueCheckpoint, overdueCheckpoints } from '../../domain/overdue-checkpoints.js';
import { SENT_REMINDER_STORE } from '../../domain/ports/sent-reminder.store.js';
import type { SentReminderStore } from '../../domain/ports/sent-reminder.store.js';

const MINUTE_MS = 60_000;

/**
 * Every 3 hours during today's opening hours, and 30 minutes before closing, tells the barber's
 * phone (with voice) which of today's appointments already ended and are still active, so they
 * complete or cancel them by hand. Nothing is sent when every past appointment is closed.
 */
@Injectable()
export class SendOverdueAppointmentsAlertUseCase {
  constructor(
    private readonly listWorkspaces: ListNotifiedWorkspacesUseCase,
    private readonly listAppointments: ListAppointmentsUseCase,
    private readonly businessHours: GetBusinessHoursUseCase,
    private readonly notifyOverdue: NotifyOverdueAppointmentsUseCase,
    private readonly getBarberName: GetBarberNameUseCase,
    @Inject(SENT_REMINDER_STORE) private readonly sent: SentReminderStore,
  ) {}

  async execute(now: Date = new Date()): Promise<void> {
    const today = localIsoDate(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    for (const id of await this.listWorkspaces.execute()) {
      try {
        await WorkspaceContext.run({ id, role: 'admin' }, () => this.checkWorkspace(id, today, nowMinutes, now));
      } catch (error) {
        console.error(`Overdue check failed for workspace ${id}:`, error instanceof Error ? error.message : error);
      }
    }
  }

  private async checkWorkspace(workspaceId: string, today: string, nowMinutes: number, now: Date): Promise<void> {
    const day = (await this.businessHours.execute()).forDate(today);
    if (!day.open) return;
    const checkpoint = dueCheckpoint(overdueCheckpoints(day.openHour, day.closeHour), nowMinutes);
    if (checkpoint === undefined) return;
    const key = `overdue:${workspaceId}:${today}:${checkpoint}`;
    if (await this.sent.has(key)) return;

    const overdue = (await this.listAppointments.execute())
      .filter((a) => a.date === today && !a.cancelled && !a.completed)
      // Parsed as local time: `process.env.TZ` is the shop's time zone.
      .filter((a) => new Date(`${a.date}T${a.time}:00`).getTime() + APPOINTMENT_MINUTES * MINUTE_MS <= now.getTime())
      .sort((a, b) => a.time.localeCompare(b.time));
    // Checked once per checkpoint even when nothing is overdue, so it is not looked at every 30 s.
    await this.sent.add(key, today);
    if (overdue.length === 0) return;

    const barber = await this.getBarberName.execute().catch(() => '');
    await this.notifyOverdue.execute({
      date: today,
      barber,
      appointments: overdue.map((a) => ({ client: a.client, time: a.time })),
    });
  }
}
