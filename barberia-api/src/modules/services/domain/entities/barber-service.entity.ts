import { InvalidServiceError } from '../errors/invalid-service.error.js';

export interface BarberServiceProps {
  id: number;
  name: string;
  price: number;
}

const MAX_NAME_LENGTH = 60;
const MAX_PRICE = 100_000;

/** Id assigned to a service that has not been persisted yet. */
export const UNSAVED_SERVICE_ID = 0;

/** A service the shop offers (for example "Classic Haircut") with its base price. */
export class BarberService {
  private constructor(private readonly props: BarberServiceProps) {}

  static create(input: { name: string; price: number }): BarberService {
    const name = input.name.trim();
    if (!name) {
      throw new InvalidServiceError('Service name is required');
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new InvalidServiceError(`Service name cannot exceed ${MAX_NAME_LENGTH} characters`);
    }
    if (!Number.isFinite(input.price) || input.price < 0 || input.price > MAX_PRICE) {
      throw new InvalidServiceError(`Price must be between 0 and ${MAX_PRICE}`);
    }
    return new BarberService({ id: UNSAVED_SERVICE_ID, name, price: input.price });
  }

  static restore(props: BarberServiceProps): BarberService {
    return new BarberService(props);
  }

  get id(): number { return this.props.id; }
  get name(): string { return this.props.name; }
  get price(): number { return this.props.price; }
}
