import { Inject, Injectable } from '@nestjs/common';
import { WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';
import { InvalidDeviceTokenError } from '../../domain/errors/invalid-device-token.error.js';
import { DEVICE_TOKEN_REPOSITORY } from '../../domain/ports/device-token.repository.js';
import type { DeviceTokenRepository } from '../../domain/ports/device-token.repository.js';
import type { RegisterDeviceInput } from '../dtos/device.dto.js';

const PLATFORMS = ['android', 'ios', 'web'];
const MAX_TOKEN_LENGTH = 4096;

/** Links the phone of the caller to its workspace so it receives that workspace's notifications. */
@Injectable()
export class RegisterDeviceUseCase {
  constructor(@Inject(DEVICE_TOKEN_REPOSITORY) private readonly devices: DeviceTokenRepository) {}

  async execute(input: RegisterDeviceInput): Promise<void> {
    const token = input.token.trim();
    if (!token || token.length > MAX_TOKEN_LENGTH) {
      throw new InvalidDeviceTokenError('token must be a non-empty push registration token');
    }
    if (!PLATFORMS.includes(input.platform)) {
      throw new InvalidDeviceTokenError(`platform must be one of ${PLATFORMS.join(', ')}`);
    }
    await this.devices.save(token, WorkspaceContext.currentId(), input.platform);
  }
}
