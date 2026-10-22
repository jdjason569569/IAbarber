import { Injectable } from '@nestjs/common';
import { BarberService } from '../../domain/entities/barber-service.entity.js';
import { DuplicateServiceError } from '../../domain/errors/duplicate-service.error.js';
import type { ServiceRepository } from '../../domain/ports/service.repository.js';

@Injectable()
export class InMemoryServiceRepository implements ServiceRepository {
  // Starts empty on purpose: services are configured from the app (Settings tab).
  private readonly items: BarberService[] = [];

  async findAll(): Promise<BarberService[]> {
    return [...this.items];
  }

  async findByName(name: string): Promise<BarberService | null> {
    const key = name.trim().toLowerCase();
    return this.items.find((s) => s.name.toLowerCase() === key) ?? null;
  }

  async save(service: BarberService): Promise<BarberService> {
    if (await this.findByName(service.name)) {
      throw new DuplicateServiceError(`Service "${service.name}" already exists`);
    }
    const stored = BarberService.restore({
      id: Math.max(0, ...this.items.map((s) => s.id)) + 1,
      name: service.name,
      price: service.price,
    });
    this.items.push(stored);
    return stored;
  }

  async deleteById(id: number): Promise<boolean> {
    const index = this.items.findIndex((s) => s.id === id);
    if (index < 0) return false;
    this.items.splice(index, 1);
    return true;
  }
}
