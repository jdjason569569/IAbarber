import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { AddServiceUseCase } from '../../application/use-cases/add-service.use-case.js';
import { ListServicesUseCase } from '../../application/use-cases/list-services.use-case.js';
import { RemoveServiceUseCase } from '../../application/use-cases/remove-service.use-case.js';
import { DuplicateServiceError } from '../../domain/errors/duplicate-service.error.js';
import { InvalidServiceError } from '../../domain/errors/invalid-service.error.js';
import { ServiceNotFoundError } from '../../domain/errors/service-not-found.error.js';
import type { AddServiceRequest } from './add-service.request.js';

@Controller('services')
export class ServicesController {
  constructor(
    private readonly listServices: ListServicesUseCase,
    private readonly addService: AddServiceUseCase,
    private readonly removeService: RemoveServiceUseCase,
  ) {}

  @Get()
  list() {
    return this.listServices.execute();
  }

  @Post()
  async add(@Body() body: AddServiceRequest) {
    try {
      return await this.addService.execute({
        name: String(body?.name ?? ''),
        price: Number(body?.price),
      });
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.removeService.execute(id);
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  private toHttpError(error: unknown): unknown {
    if (error instanceof InvalidServiceError) return new BadRequestException(error.message);
    if (error instanceof DuplicateServiceError) return new ConflictException(error.message);
    if (error instanceof ServiceNotFoundError) return new NotFoundException(error.message);
    return error;
  }
}
