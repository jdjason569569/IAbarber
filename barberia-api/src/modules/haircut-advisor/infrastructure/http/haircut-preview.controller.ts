import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { GenerateHaircutPreviewUseCase } from '../../application/use-cases/generate-haircut-preview.use-case.js';
import { HaircutNotFoundError } from '../../domain/errors/haircut-not-found.error.js';
import { ImageQuotaExceededError } from '../../domain/errors/image-quota-exceeded.error.js';
import { InvalidPhotoError } from '../../domain/errors/invalid-photo.error.js';

interface HaircutPreviewRequest {
  photo?: string;
  haircutId?: string;
}

@Controller('haircut-preview')
export class HaircutPreviewController {
  constructor(
    private readonly generatePreview: GenerateHaircutPreviewUseCase,
  ) {}

  /** Receives `{ photo, haircutId }` and answers `{ image }`: the client with that cut, drawn by Gemini. */
  @Post()
  async generate(@Body() body: HaircutPreviewRequest) {
    try {
      return await this.generatePreview.execute({
        photo: typeof body?.photo === 'string' ? body.photo : '',
        haircutId: typeof body?.haircutId === 'string' ? body.haircutId : '',
      });
    } catch (error) {
      if (error instanceof InvalidPhotoError)
        throw new BadRequestException(error.message);
      if (error instanceof HaircutNotFoundError)
        throw new NotFoundException(error.message);
      if (error instanceof ImageQuotaExceededError) {
        console.error(error.message);
        throw new HttpException(
          'Image quota exceeded',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw error;
    }
  }
}
