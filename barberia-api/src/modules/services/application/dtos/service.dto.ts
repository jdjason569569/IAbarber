import type { BarberService } from '../../domain/entities/barber-service.entity.js';

export interface ServiceDto {
  id: number;
  name: string;
  price: number;
}

export function toServiceDto(service: BarberService): ServiceDto {
  return { id: service.id, name: service.name, price: service.price };
}
