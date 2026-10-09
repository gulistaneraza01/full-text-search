import { apiRequest } from "./api";

export type Product = {
  id: string;
  name: string;
  description: string;
  type: string;
  price: number;
  createdAt: string;
  modifiedAt: string;
};

export type ProductPage = { items: Product[]; total: number; page: number; pageSize: number };

// Categories in the seed data; the form suggests them but accepts any value.
export const PRODUCT_TYPES = [
  "Beauty", "Books", "Clothing", "Electronics", "Footwear",
  "Home", "Kitchen", "Outdoors", "Sports", "Toys",
] as const;

export const PRODUCTS_PAGE_SIZE = 20;

export function listProducts(page: number) {
  return apiRequest<ProductPage>(`/api/products?page=${page}&pageSize=${PRODUCTS_PAGE_SIZE}`);
}

export function getProduct(id: string) {
  return apiRequest<Product>(`/api/products/${encodeURIComponent(id)}`);
}
