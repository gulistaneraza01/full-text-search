import Link from "next/link";
import { createProductAction } from "../actions";
import { ProductForm } from "../_components/product-form";

export default function NewProductPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 pt-10 pb-20 sm:px-8">
      <header className="flex flex-col gap-2">
        <Link href="/products" className="w-fit text-sm text-muted transition hover:text-ink">
          ← Products
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">New product</h1>
        <p className="text-muted">Saved to Postgres, then synced to Elasticsearch automatically.</p>
      </header>

      <div className="rounded-2xl border border-rule bg-surface p-6 shadow-[0_1px_2px_rgba(23,22,15,0.04),0_8px_24px_-16px_rgba(23,22,15,0.18)] sm:p-8">
        <ProductForm action={createProductAction} initial={{ name: "", description: "", type: "", price: "" }} submitLabel="Create product" />
      </div>
    </main>
  );
}
