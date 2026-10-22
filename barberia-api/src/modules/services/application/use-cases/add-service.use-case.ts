import { Inject, Injectable } from '@nestjs/common';
import { BarberService } from '../../domain/entities/barber-service.entity.js';
import { DuplicateServiceError } from '../../domain/errors/duplicate-service.error.js';
import { SERVICE_REPOSITORY } from '../../domain/ports/service.repository.js';
import type { ServiceRepository } from '../../domain/ports/service.repository.js';
import { toServiceDto } from '../dtos/service.dto.js';
import type { ServiceDto } from '../dtos/service.dto.js';

@Injectable()
export class AddServiceUseCase {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository) {}

  async execute(input: { name: string; price: number }): Promise<ServiceDto> {
    const service = BarberService.create(input);
    if (await this.services.findByName(service.name)) {
      throw new DuplicateServiceError(`Service "${service.name}" already exists`);
    }
    return toServiceDto(await this.services.save(service));
  }
}
