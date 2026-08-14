export type ProductWare = 'Kunstwerk' | 'Buch';
export type ProductType = 'Print' | 'Postkarte' | '';
export type ProductStatus = 'available' | 'sold' | 'unavailable';

export interface ShopProduct {
  id: number;
  uid: string;
  ware: ProductWare;
  name: string;
  typ: ProductType;
  limited_no: number | null;
  limited_total: number | null;
  size: string;
  stock_quantity: number;
  price_cents: number;
  status: ProductStatus;
  version: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
}

export interface ImportProduct {
  uid: string;
  ware: ProductWare;
  name: string;
  typ: ProductType;
  limited_no: number | null;
  limited_total: number | null;
  size: string;
  stock_quantity: number;
  price_cents: number;
  status: ProductStatus;
}

export interface TabularExport {
  filename: string;
  sheetName: string;
  headers: string[];
  rows: Array<Array<string | number | null>>;
}
