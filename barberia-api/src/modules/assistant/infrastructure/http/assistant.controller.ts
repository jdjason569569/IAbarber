import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import type { BookingAnswers, BookingDraft, BookingStep } from '../../application/dtos/booking.dto.js';
import { HandleBookingTurnUseCase } from '../../application/use-cases/handle-booking-turn.use-case.js';
import { HandleVoiceCommandUseCase } from '../../application/use-cases/handle-voice-command.use-case.js';

const BOOKING_STEPS: BookingStep[] = ['client', 'date', 'time', 'price'];

interface CommandRequest {
  text?: string;
  confirmCancelId?: number;
}

@Controller('assistant')
export class AssistantController {
  constructor(
    private readonly handleCommand: HandleVoiceCommandUseCase,
    private readonly handleBookingTurn: HandleBookingTurnUseCase,
  ) {}

  @Post('booking')
  async booking(
    @Body() body: { text?: string; draft?: BookingDraft; answers?: Record<string, unknown>; preview?: boolean },
  ) {
    try {
      return await this.handleBookingTurn.execute({
        text: typeof body?.text === 'string' ? body.text : '',
        draft: body?.draft ?? {},
        answers: pickAnswers(body?.answers),
        preview: body?.preview === true,
      });
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Assistant failed',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Post('command')
  async command(@Body() body: CommandRequest) {
    try {
      return await this.handleCommand.execute({
        text: body?.text === undefined ? undefined : String(body.text),
        confirmCancelId:
          body?.confirmCancelId === undefined ? undefined : Number(body.confirmCancelId),
      });
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Assistant failed',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}

/** Keeps only the known steps with a non-empty text answer. */
function pickAnswers(raw: Record<string, unknown> | undefined): BookingAnswers | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const answers: BookingAnswers = {};
  for (const step of BOOKING_STEPS) {
    const value = raw[step];
    if (typeof value === 'string' && value.trim()) answers[step] = value.trim();
  }
  return Object.keys(answers).length > 0 ? answers : undefined;
}
