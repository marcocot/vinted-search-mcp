export type Money = {
  amount: number;
  currency: string;
};

export type Seller = {
  id: string;
  login: string | null;
  isBusiness: boolean;
};

export type VintedItem = {
  id: string;
  title: string;
  url: string;
  price: Money | null;
  serviceFee: Money | null;
  totalPrice: Money | null;
  brand: string | null;
  size: string | null;
  condition: string | null;
  favouriteCount: number | null;
  viewCount: number | null;
  seller: Seller | null;
  photo: string | null;
  promoted: boolean;
};

export type ItemDetail = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  brand: string | null;
  price: Money | null;
  condition: string | null;
  category: string | null;
  colour: string | null;
  image: string | null;
  available: boolean | null;
};
