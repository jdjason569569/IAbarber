import { Inject, Injectable } from '@nestjs/common';
import { InvalidDeviceTokenError } from '../../domain/errors/invalid-device-token.error.js';
import { DEVICE_TOKEN_REPOSITORY } from '../../domain/ports/device-token.repository.js';
import type { DeviceTokenRepository } from '../../domain/ports/device-token.repository.js';

/** Stops sending notifications to a phone (the admin logged out on it). */
@Injectable()
export class UnregisterDeviceUseCase {
  constructor(@Inject(DEVICE_TOKEN_REPOSITORY) private readonly devices: DeviceTokenRepository) {}

  async execute(token: string): Promise<void> {
    if (!token.trim()) {
      throw new InvalidDeviceTokenError('token is required');
    }
    await this.devices.remove([token.trim()]);
  }
}
