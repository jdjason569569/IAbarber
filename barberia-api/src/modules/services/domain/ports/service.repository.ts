import type { BarberService } from '../entities/barber-service.entity.js';

export const SERVICE_REPOSITORY = Symbol('SERVICE_REPOSITORY');

export interface ServiceRepository {
  findAll(): Promise<BarberService[]>;
  /** Case-insensitive lookup by name. */
  findByName(name: string): Promise<BarberService | null>;
  /** Inserts a new service (id unassigned); returns the stored copy. Throws `DuplicateServiceError` on a repeated name. */
  save(service: BarberService): Promise<BarberService>;
  /** Returns false when no service had that id. */
  deleteById(id: number): Promise<boolean>;
}
