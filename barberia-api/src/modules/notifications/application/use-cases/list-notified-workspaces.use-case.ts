import { Inject, Injectable } from '@nestjs/common';
import { DEVICE_TOKEN_REPOSITORY } from '../../domain/ports/device-token.repository.js';
import type { DeviceTokenRepository } from '../../domain/ports/device-token.repository.js';

/** Workspaces with at least one phone registered for pushes: the only ones worth reminding. */
@Injectable()
export class ListNotifiedWorkspacesUseCase {
  constructor(@Inject(DEVICE_TOKEN_REPOSITORY) private readonly devices: DeviceTokenRepository) {}

  execute(): Promise<string[]> {
    return this.devices.findWorkspaceIds();
  }
}
