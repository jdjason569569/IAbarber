import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import type { BookingDraft } from '../../application/dtos/booking.dto.js';
import { HandleBookingTurnUseCase } from '../../application/use-cases/handle-booking-turn.use-case.js';
import { HandleVoiceCommandUseCase } from '../../application/use-cases/handle-voice-command.use-case.js';

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
  async booking(@Body() body: { text?: string; draft?: BookingDraft }) {
    try {
      return await this.handleBookingTurn.execute({
        text: typeof body?.text === 'string' ? body.text : '',
        draft: body?.draft ?? {},
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
