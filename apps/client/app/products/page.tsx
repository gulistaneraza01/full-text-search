import Link from "next/link";
import { Suspense } from "react";
import { listProducts, PRODUCTS_PAGE_SIZE } from "../_lib/products";
import { DeleteButton } from "./_components/delete-button";

const priceFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const countFmt = new Intl.NumberFormat("en-US");
const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

const NOTICES: Record<string, string> = {
  created: "Product created.",
  updated: "Product updated.",
  deleted: "Product deleted.",
};

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pt-10 pb-20 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Catalogue</p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Products</h1>
        </div>
        <Link
          href="/products/new"
          className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 font-medium text-paper shadow-sm transition hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98]"
        >
          <span aria-hidden className="text-lg leading-none">+</span> New product
        </Link>
      </header>

      <Suspense fallback={<TableSkeleton />}>
        <ProductTable searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ProductTable({ searchParams }: Pick<PageProps<"/products">, "searchParams">) {
  const sp = await searchParams;
  const pageParam = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const notice = typeof sp.notice === "string" ? NOTICES[sp.notice] : undefined;
  const highlightId = typeof sp.id === "string" ? sp.id : undefined;

  const res = await listProducts(page);
  if (!res.ok) {
    return (
      <p role="alert" className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
        {res.error}
      </p>
    );
  }

  const { items, total } = res.data;
  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE));

  return (
    <>
      {notice && (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-ok/25 bg-ok/8 px-4 py-3 text-sm">
          <span className="font-medium text-ok">✓ {notice}</span>
          <span className="text-muted">Postgres is updated now; Elasticsearch catches up within a few seconds.</span>
        </div>
      )}

      <section aria-label="Product list" className="min-w-0 overflow-hidden rounded-2xl border border-rule bg-surface shadow-[0_1px_2px_rgba(23,22,15,0.04),0_8px_24px_-16px_rgba(23,22,15,0.18)]">
        <div className="flex items-center justify-between border-b border-rule px-5 py-3">
          <p className="text-sm text-muted">
            <span className="font-mono tabular-nums text-ink">{countFmt.format(total)}</span> products · newest first
          </p>
          <p className="font-mono text-xs tabular-nums text-muted">
            Page {page} of {countFmt.format(totalPages)}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-ink">No products on this page.</p>
            <Link href="/products" className="mt-2 inline-block text-sm text-muted underline underline-offset-4 hover:text-ink">
              Back to first page
            </Link>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="bg-paper/70 font-mono text-[10px] uppercase tracking-widest text-muted">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-normal">Product</th>
                  <th scope="col" className="px-3 py-2.5 font-normal">Category</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-normal">Price</th>
                  <th scope="col" className="px-3 py-2.5 font-normal">Updated</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-normal">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {items.map((p) => (
                  <tr key={p.id} className={`group transition-colors hover:bg-paper/60 ${p.id === highlightId ? "bg-mark/25" : ""}`}>
                    <td className="max-w-md px-5 py-3.5">
                      <p className="font-medium text-ink">{p.name}</p>
                      <p className="truncate text-muted">{p.description}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="rounded-md border border-rule bg-paper px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-muted">
                        {p.type}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-ink">{priceFmt.format(p.price)}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-muted">
                      <time dateTime={p.modifiedAt}>{dateFmt.format(new Date(p.modifiedAt))}</time>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/products/${p.id}/edit`}
                          aria-label={`Edit ${p.name}`}
                          className="rounded-lg px-2.5 py-1.5 text-sm text-ink transition hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-ink"
                        >
                          Edit
                        </Link>
                        <DeleteButton id={p.id} name={p.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {totalPages > 1 && <Pager page={page} totalPages={totalPages} />}
    </>
  );
}

function Pager({ page, totalPages }: { page: number; totalPages: number }) {
  const linkClass =
    "rounded-full border border-rule bg-surface px-4 py-2 text-sm text-ink transition hover:border-ink focus-visible:outline-2 focus-visible:outline-ink";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={`/products?page=${page - 1}`} className={linkClass}>
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      {page < totalPages ? (
        <Link href={`/products?page=${page + 1}`} className={linkClass}>
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

function TableSkeleton() {
  return <div role="status" aria-label="Loading products" className="h-[36rem] animate-pulse rounded-2xl border border-rule bg-surface" />;
}
