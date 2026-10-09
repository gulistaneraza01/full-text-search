"use client";

import { useState, useTransition } from "react";
import { deleteProductAction } from "../actions";

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    if (!window.confirm(`Delete “${name}”? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProductAction(id);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label={`Delete ${name}`}
        className="rounded-lg px-2.5 py-1.5 text-sm text-danger transition hover:bg-danger/8 focus-visible:outline-2 focus-visible:outline-danger disabled:cursor-wait disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </>
  );
}
