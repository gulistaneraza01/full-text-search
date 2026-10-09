"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { PRODUCT_TYPES } from "../../_lib/products";
import type { ProductFormState, ProductFormValues } from "../actions";

type Props = {
  action: (prev: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  initial: ProductFormValues;
  submitLabel: string;
};

const fieldClass =
  "w-full rounded-xl border border-rule bg-surface px-3.5 py-2.5 text-ink shadow-[inset_0_1px_0_rgba(23,22,15,0.03)] outline-none transition placeholder:text-muted/60 focus:border-ink focus:ring-4 focus:ring-ink/5";

export function ProductForm({ action, initial, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: null, values: initial });
  const typesId = useId();
  const v = state.values;

  return (
    <form action={formAction} className="flex flex-col gap-6" aria-describedby={state.error ? "form-error" : undefined}>
      {state.error && (
        <p id="form-error" role="alert" className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Field label="Name" htmlFor="name" hint="Shown in results and autocomplete.">
        <input id="name" name="name" required maxLength={200} defaultValue={v.name} placeholder="Acme Trail Lantern" className={fieldClass} />
      </Field>

      <Field label="Description" htmlFor="description" hint="Searchable in both engines.">
        <textarea
          id="description"
          name="description"
          required
          maxLength={2000}
          rows={4}
          defaultValue={v.description}
          placeholder="A rugged, rechargeable camping lantern with three brightness levels."
          className={`${fieldClass} resize-y leading-relaxed`}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Category" htmlFor="type">
          <input id="type" name="type" required maxLength={50} list={typesId} defaultValue={v.type} placeholder="Outdoors" className={fieldClass} />
          <datalist id={typesId}>
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>

        <Field label="Price (USD)" htmlFor="price">
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-muted">
              $
            </span>
            <input
              id="price"
              name="price"
              type="number"
              required
              min={0}
              max={1_000_000}
              step="0.01"
              inputMode="decimal"
              defaultValue={v.price}
              placeholder="19.50"
              className={`${fieldClass} pl-7 font-mono tabular-nums`}
            />
          </div>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-6">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-ink px-5 py-2.5 font-medium text-paper shadow-sm transition hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href="/products" className="rounded-xl px-4 py-2.5 text-muted transition hover:bg-ink/5 hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
