import { Inject, Injectable } from '@nestjs/common';
import { localIsoDate } from '../../../../shared/utils/local-date.js';
import { WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';
import { ListAppointmentsUseCase } from '../../../appointments/application/use-cases/list-appointments.use-case.js';
import { ListNotifiedWorkspacesUseCase } from '../../../notifications/application/use-cases/list-notified-workspaces.use-case.js';
import { NotifyUpcomingAppointmentUseCase } from '../../../notifications/application/use-cases/notify-upcoming-appointment.use-case.js';
import { GetBarberNameUseCase } from '../../../shop-settings/application/use-cases/get-barber-name.use-case.js';
import { fillReminderPhrase, reminderPhrases } from '../../domain/reminder-phrases.js';
import { SENT_REMINDER_STORE } from '../../domain/ports/sent-reminder.store.js';
import type { SentReminderStore } from '../../domain/ports/sent-reminder.store.js';

/** How long before an appointment the barber is reminded: twice, 10 and 5 minutes before. Ascending. */
export const REMINDER_LEAD_MINUTES = [5, 10] as const;

const MINUTE_MS = 60_000;

/**
 * Pushes "appointment in 10 minutes" and then "in 5 minutes" for every booking of today, each once per
 * appointment slot (a moved appointment is reminded again at its new time). An appointment booked
 * closer than 10 minutes only gets the reminders still ahead of it.
 * Each reminder is a random phrase that calls the barber by name (see reminder-phrases.ts).
 * Walk-ins, completed and cancelled appointments are skipped.
 */
@Injectable()
export class SendAppointmentRemindersUseCase {
  /** Last phrase used per workspace and lead, so the same one never plays twice in a row. */
  private readonly lastPhrase = new Map<string, number>();

  constructor(
    private readonly listWorkspaces: ListNotifiedWorkspacesUseCase,
    private readonly listAppointments: ListAppointmentsUseCase,
    private readonly notifyUpcoming: NotifyUpcomingAppointmentUseCase,
    private readonly getBarberName: GetBarberNameUseCase,
    @Inject(SENT_REMINDER_STORE) private readonly sent: SentReminderStore,
  ) {}

  async execute(now: Date = new Date()): Promise<void> {
    const today = localIsoDate(now);
    await this.sent.forgetBefore(today);
    const workspaceIds = await this.listWorkspaces.execute();
    for (const id of workspaceIds) {
      try {
        await WorkspaceContext.run({ id, role: 'admin' }, () => this.remindWorkspace(id, today, now));
      } catch (error) {
        console.error(`Reminders failed for workspace ${id}:`, error instanceof Error ? error.message : error);
      }
    }
  }

  private async remindWorkspace(workspaceId: string, today: string, now: Date): Promise<void> {
    const appointments = await this.listAppointments.execute();
    let barber: string | undefined;
    for (const a of appointments) {
      if (a.date !== today || a.cancelled || a.completed || a.walkIn) continue;
      // Parsed as local time: `process.env.TZ` is the shop's time zone.
      const msLeft = new Date(`${a.date}T${a.time}:00`).getTime() - now.getTime();
      // The tightest reminder window the appointment is in: ≤ 5 min → the 5-minute one, ≤ 10 → the 10.
      const lead = REMINDER_LEAD_MINUTES.find((minutes) => msLeft <= minutes * MINUTE_MS);
      if (msLeft <= 0 || lead === undefined) continue;
      const key = `${workspaceId}:${a.id}:${a.date}:${a.time}:${lead}`;
      if (await this.sent.has(key)) continue;
      const minutes = Math.max(1, Math.ceil(msLeft / MINUTE_MS));
      // Read once per run, only when a reminder is due; a failed read just leaves the name out.
      barber ??= await this.getBarberName.execute().catch(() => '');
      const message = fillReminderPhrase(this.pickPhrase(workspaceId, lead), barber, a.client, minutes);
      if (await this.notifyUpcoming.execute({ client: a.client, date: a.date, time: a.time, minutes, message })) {
        await this.sent.add(key, a.date);
      }
    }
  }

  /** A random phrase for this lead, never the one this workspace heard last time. */
  private pickPhrase(workspaceId: string, lead: number): string {
    const phrases = reminderPhrases(lead);
    const key = `${workspaceId}:${lead}`;
    const last = this.lastPhrase.get(key);
    let index = Math.floor(Math.random() * phrases.length);
    if (index === last) index = (index + 1) % phrases.length;
    this.lastPhrase.set(key, index);
    return phrases[index];
  }
}
