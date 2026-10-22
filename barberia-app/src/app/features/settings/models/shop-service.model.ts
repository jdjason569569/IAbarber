/** A service the shop offers, with its base price. */
export interface ShopService {
  id: number;
  name: string;
  price: number;
}

export interface NewShopService {
  name: string;
  price: number;
}
