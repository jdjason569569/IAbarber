import { readFileSync } from 'node:fs';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { DomainError } from '../../../../shared/errors/domain.error.js';
import { ADMIN_WORKSPACE, WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';
import { BookFromWebUseCase } from '../../application/use-cases/book-from-web.use-case.js';
import { CancelWebBookingUseCase } from '../../application/use-cases/cancel-web-booking.use-case.js';
import { GetPublicSlotsUseCase } from '../../application/use-cases/get-public-slots.use-case.js';
import { GetWebBookingUseCase } from '../../application/use-cases/get-web-booking.use-case.js';
import { RescheduleWebBookingUseCase } from '../../application/use-cases/reschedule-web-booking.use-case.js';
import { InvalidBookingLinkError } from '../../domain/errors/invalid-booking-link.error.js';
import { InvalidWebBookingError } from '../../domain/errors/invalid-web-booking.error.js';
import { RescheduleLimitError } from '../../domain/errors/reschedule-limit.error.js';
import { TooLateToChangeError } from '../../domain/errors/too-late-to-change.error.js';
import { TooManyBookingsError } from '../../domain/errors/too-many-bookings.error.js';

/** The page is three static files, read once (copied next to this file by nest-cli.json `assets`). */
const read = (file: string) => readFileSync(new URL(`./page/${file}`, import.meta.url), 'utf8');
const PAGE = read('reservar.html');
const ASSETS: Record<string, { body: string; type: string }> = {
  'reservar.js': { body: read('reservar.js'), type: 'text/javascript; charset=utf-8' },
  'reservar.css': { body: read('reservar.css'), type: 'text/css; charset=utf-8' },
};

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; " +
  "base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

// Messages for the client, in Spanish (the page shows them as they are).
const MESSAGES = {
  name: 'Escribe tu nombre (mínimo 2 letras).',
  phone: 'Escribe un número de celular válido, por ejemplo 300 123 4567.',
  date: 'Solo puedes reservar para hoy o mañana.',
  tooMany: 'Se hicieron muchas reservas en poco tiempo. Intenta más tarde o escríbenos por WhatsApp.',
  slot: 'Esa hora ya no está disponible. Elige otra.',
  link: 'No encontramos esta cita. Revisa el enlace.',
  tooLate: 'Tu cita ya no se puede cambiar por aquí (faltan menos de 30 minutos o ya pasó). Escríbenos por WhatsApp.',
  rescheduleLimit: 'Tu cita ya se cambió una vez. Para otro cambio escríbenos por WhatsApp.',
  invalid: 'No se pudo reservar. Revisa los datos e intenta de nuevo.',
};

interface BookRequest {
  name?: unknown;
  phone?: unknown;
  date?: unknown;
  time?: unknown;
  /** Honeypot: hidden on the page, only bots fill it. */
  website?: unknown;
}

interface RescheduleRequest {
  date?: unknown;
  time?: unknown;
}

/**
 * Public booking page (`/reservar`): clients book with a name and a phone, and manage the booking
 * from its private link (`/reservar/cita/<id>/<token>`). No login: AuthMiddleware lets `/reservar`
 * through and every request works on the admin's workspace.
 */
@Controller('reservar')
export class PublicBookingController {
  constructor(
    private readonly getSlots: GetPublicSlotsUseCase,
    private readonly book: BookFromWebUseCase,
    private readonly getBooking: GetWebBookingUseCase,
    private readonly cancelBooking: CancelWebBookingUseCase,
    private readonly rescheduleBooking: RescheduleWebBookingUseCase,
  ) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Content-Security-Policy', CSP)
  @Header('Cache-Control', 'no-store')
  page() {
    return PAGE;
  }

  @Get('cita/:id/:token')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Content-Security-Policy', CSP)
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  bookingPage() {
    return PAGE;
  }

  @Get('assets/:file')
  @Header('Cache-Control', 'public, max-age=300')
  asset(@Param('file') file: string, @Req() req: Request) {
    const asset = Object.hasOwn(ASSETS, file) ? ASSETS[file] : undefined;
    if (!asset) throw new NotFoundException();
    req.res?.type(asset.type);
    return asset.body;
  }

  @Get('api/slots')
  @Header('Cache-Control', 'no-store')
  slots() {
    return this.run(() => this.getSlots.execute());
  }

  @Post('api/bookings')
  @HttpCode(201)
  create(@Body() body: BookRequest, @Req() req: Request) {
    if (text(body?.website)) {
      throw new BadRequestException(MESSAGES.invalid);
    }
    return this.run(() =>
      this.book.execute({
        name: text(body?.name),
        phone: text(body?.phone),
        date: text(body?.date),
        time: text(body?.time),
        ip: clientIp(req),
      }),
    );
  }

  @Get('api/bookings/:id/:token')
  @Header('Cache-Control', 'no-store')
  show(@Param('id') id: string, @Param('token') token: string) {
    return this.run(() => this.getBooking.execute(Number(id), token));
  }

  @Post('api/bookings/:id/:token/cancel')
  @HttpCode(200)
  cancel(@Param('id') id: string, @Param('token') token: string) {
    return this.run(() => this.cancelBooking.execute(Number(id), token));
  }

  @Post('api/bookings/:id/:token/reschedule')
  @HttpCode(200)
  reschedule(@Param('id') id: string, @Param('token') token: string, @Body() body: RescheduleRequest) {
    return this.run(() => this.rescheduleBooking.execute(Number(id), token, text(body?.date), text(body?.time)));
  }

  /** Runs in the admin's workspace and turns domain errors into Spanish messages for the page. */
  private async run<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await WorkspaceContext.run(ADMIN_WORKSPACE, work);
    } catch (error) {
      throw toHttpError(error);
    }
  }
}

function toHttpError(error: unknown): unknown {
  if (error instanceof InvalidWebBookingError) return new BadRequestException(MESSAGES[error.field]);
  if (error instanceof InvalidBookingLinkError) return new NotFoundException(MESSAGES.link);
  if (error instanceof TooManyBookingsError) return new HttpException(MESSAGES.tooMany, HttpStatus.TOO_MANY_REQUESTS);
  if (error instanceof TooLateToChangeError) return new ConflictException(MESSAGES.tooLate);
  if (error instanceof RescheduleLimitError) return new ConflictException(MESSAGES.rescheduleLimit);
  // Slot taken in between, closed or blocked hour, time already past...
  if (error instanceof DomainError) return new ConflictException(MESSAGES.slot);
  return error;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, 200) : '';
}

/** Render puts the client's address first in X-Forwarded-For. */
function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || req.socket.remoteAddress || 'unknown';
}
