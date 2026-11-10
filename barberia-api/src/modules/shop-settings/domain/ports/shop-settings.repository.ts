export const SHOP_SETTINGS_REPOSITORY = Symbol('SHOP_SETTINGS_REPOSITORY');

/** Settings of the current workspace's shop. */
export interface ShopSettingsRepository {
  /** Value of the haircut; 0 while it was never configured. */
  getServicePrice(): Promise<number>;
  saveServicePrice(price: number): Promise<void>;
}
