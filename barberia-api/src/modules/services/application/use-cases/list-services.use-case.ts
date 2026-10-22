import { Inject, Injectable } from '@nestjs/common';
import { SERVICE_REPOSITORY } from '../../domain/ports/service.repository.js';
import type { ServiceRepository } from '../../domain/ports/service.repository.js';
import { toServiceDto } from '../dtos/service.dto.js';
import type { ServiceDto } from '../dtos/service.dto.js';

@Injectable()
export class ListServicesUseCase {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository) {}

  async execute(): Promise<ServiceDto[]> {
    return (await this.services.findAll()).map(toServiceDto);
  }
}
