import { Injectable } from '@nestjs/common';
import type { DeviceTokenRepository } from '../../domain/ports/device-token.repository.js';

@Injectable()
export class InMemoryDeviceTokenRepository implements DeviceTokenRepository {
  /** token → workspace id. */
  private readonly tokens = new Map<string, string>();

  save(token: string, workspaceId: string): Promise<void> {
    this.tokens.set(token, workspaceId);
    return Promise.resolve();
  }

  remove(tokens: string[]): Promise<void> {
    tokens.forEach((token) => this.tokens.delete(token));
    return Promise.resolve();
  }

  findByWorkspace(workspaceId: string): Promise<string[]> {
    return Promise.resolve([...this.tokens].filter(([, ws]) => ws === workspaceId).map(([token]) => token));
  }
}
