import { Injectable } from '@nestjs/common';
import { WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';
import type { ShopSettingsRepository } from '../../domain/ports/shop-settings.repository.js';

@Injectable()
export class InMemoryShopSettingsRepository implements ShopSettingsRepository {
  private readonly prices = new Map<string, number>();

  async getServicePrice(): Promise<number> {
    return this.prices.get(WorkspaceContext.currentId()) ?? 0;
  }

  async saveServicePrice(price: number): Promise<void> {
    this.prices.set(WorkspaceContext.currentId(), price);
  }
}
