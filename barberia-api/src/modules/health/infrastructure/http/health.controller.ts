import { Controller, Get } from '@nestjs/common';

/**
 * Public and cheap: no database. cron-job.org calls it every 10 minutes so Render does not put the
 * API to sleep (the appointment reminders only run while the process is awake).
 */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
