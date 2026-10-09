import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProduct } from "../../../_lib/products";
import { updateProductAction } from "../../actions";
import { ProductForm } from "../../_components/product-form";

export default function EditProductPage({ params }: PageProps<"/products/[id]/edit">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 pt-10 pb-20 sm:px-8">
      <header className="flex flex-col gap-2">
        <Link href="/products" className="w-fit text-sm text-muted transition hover:text-ink">
          ← Products
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Edit product</h1>
      </header>

      <div className="rounded-2xl border border-rule bg-surface p-6 shadow-[0_1px_2px_rgba(23,22,15,0.04),0_8px_24px_-16px_rgba(23,22,15,0.18)] sm:p-8">
        <Suspense fallback={<div role="status" aria-label="Loading product" className="h-96 animate-pulse rounded-xl bg-paper" />}>
          <EditForm params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function EditForm({ params }: Pick<PageProps<"/products/[id]/edit">, "params">) {
  const { id } = await params;
  const res = await getProduct(id);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return (
      <p role="alert" className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
        {res.error}
      </p>
    );
  }

  const p = res.data;
  return (
    <>
      <p className="mb-6 font-mono text-[11px] text-muted">ID {p.id}</p>
      <ProductForm
        action={updateProductAction.bind(null, p.id)}
        initial={{ name: p.name, description: p.description, type: p.type, price: String(p.price) }}
        submitLabel="Save changes"
      />
    </>
  );
}
