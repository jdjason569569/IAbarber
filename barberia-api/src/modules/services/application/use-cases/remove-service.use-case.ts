import { Inject, Injectable } from '@nestjs/common';
import { ServiceNotFoundError } from '../../domain/errors/service-not-found.error.js';
import { SERVICE_REPOSITORY } from '../../domain/ports/service.repository.js';
import type { ServiceRepository } from '../../domain/ports/service.repository.js';

@Injectable()
export class RemoveServiceUseCase {
  constructor(@Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository) {}

  async execute(id: number): Promise<void> {
    if (!(await this.services.deleteById(id))) {
      throw new ServiceNotFoundError(`Service ${id} not found`);
    }
  }
}
