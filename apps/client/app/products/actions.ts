"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "../_lib/api";
import type { Product } from "../_lib/products";

export type ProductFormValues = { name: string; description: string; type: string; price: string };
export type ProductFormState = { error: string | null; values: ProductFormValues };

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

function readForm(formData: FormData): ProductFormValues {
  return {
    name: text(formData, "name"),
    description: text(formData, "description"),
    type: text(formData, "type"),
    price: text(formData, "price"),
  };
}

// The Express API validates fully; this only converts the form strings to the JSON shape.
function toPayload(values: ProductFormValues) {
  return JSON.stringify({ ...values, price: values.price === "" ? undefined : Number(values.price) });
}

export async function createProductAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const values = readForm(formData);
  const res = await apiRequest<Product>("/api/products", { method: "POST", body: toPayload(values) });
  if (!res.ok) return { error: res.error, values };

  revalidatePath("/products");
  redirect(`/products?notice=created&id=${res.data.id}`);
}

export async function updateProductAction(
  id: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const values = readForm(formData);
  const res = await apiRequest<Product>(`/api/products/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: toPayload(values),
  });
  if (!res.ok) return { error: res.error, values };

  revalidatePath("/products");
  redirect(`/products?notice=updated&id=${id}`);
}

export async function deleteProductAction(id: string): Promise<{ error: string } | void> {
  const res = await apiRequest<void>(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) return { error: res.error };

  revalidatePath("/products");
  redirect("/products?notice=deleted");
}
