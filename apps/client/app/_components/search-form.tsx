"use client";

import Form from "next/form";
import { useEffect, useId, useRef, useState } from "react";
import { ENGINES, SORTS, type SearchState, type Suggestion } from "../_lib/search";

const SUGGEST_DEBOUNCE_MS = 150;
const MIN_SUGGEST_CHARS = 2;

const ENGINE_LABELS = { both: "Compare", postgres: "Postgres", elasticsearch: "Elasticsearch" } as const;

export function SearchForm({ state }: { state: SearchState }) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState(state.q);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);

  // Debounced autocomplete; aborts stale requests so results never arrive out of order.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_SUGGEST_CHARS) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const body = await res.json();
        setSuggestions(body.success ? body.data : []);
        setActive(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setSuggestions([]);
      }
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const submit = () => formRef.current?.requestSubmit();

  const choose = (s: Suggestion) => {
    if (inputRef.current) inputRef.current.value = s.name;
    setQuery(s.name);
    setOpen(false);
    submit();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % visible.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? visible.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0 && visible[active]) {
      e.preventDefault();
      choose(visible[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Short queries never fetch, so hide whatever the last fetch returned.
  const visible = query.trim().length >= MIN_SUGGEST_CHARS ? suggestions : [];
  const showList = open && visible.length > 0;

  return (
    <Form ref={formRef} action="/" className="flex flex-col gap-4" onSubmit={() => setOpen(false)}>
      <div className="relative">
        <label htmlFor="q" className="sr-only">
          Search products
        </label>
        <div className="group flex items-stretch overflow-hidden rounded-2xl border border-rule bg-surface shadow-[0_1px_0_var(--rule),0_12px_32px_-18px_rgba(22,21,15,0.35)] transition focus-within:border-ink">
          <span aria-hidden className="grid w-12 place-items-center text-muted transition-colors group-focus-within:text-ink sm:w-14">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <input
            ref={inputRef}
            id="q"
            name="q"
            type="search"
            required
            maxLength={200}
            defaultValue={state.q}
            placeholder="Try “wireless earbuds”, “skilet”, or “trainers”"
            autoComplete="off"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            className="min-w-0 flex-1 bg-transparent py-4 pr-3 text-lg text-ink outline-none placeholder:text-muted/70 [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="submit"
            className="m-1.5 rounded-xl bg-ink px-5 font-medium text-paper transition hover:bg-ink/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:scale-[0.98]"
          >
            Search
          </button>
        </div>

        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Suggestions"
            className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-rule bg-surface py-1 shadow-[0_18px_40px_-20px_rgba(22,21,15,0.45)]"
          >
            {visible.map((s, i) => (
              <li
                key={s.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown fires before the input's blur closes the list
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(s);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-baseline justify-between gap-4 px-4 py-2.5 ${i === active ? "bg-paper" : ""}`}
              >
                <span className="truncate text-ink">{s.name}</span>
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-muted">{s.type}</span>
              </li>
            ))}
            <li aria-hidden className="border-t border-rule px-4 pt-2 pb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">
              Suggestions from Elasticsearch
            </li>
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <fieldset className="flex rounded-full border border-rule bg-surface p-1">
          <legend className="sr-only">Engine</legend>
          {ENGINES.map((engine) => (
            <label key={engine} className="relative cursor-pointer">
              <input
                type="radio"
                name="engine"
                value={engine}
                defaultChecked={state.engine === engine}
                onChange={submit}
                className="peer sr-only"
              />
              <span className="block rounded-full px-3 py-1.5 text-sm sm:px-4 text-muted transition peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-ink hover:text-ink">
                {ENGINE_LABELS[engine]}
              </span>
            </label>
          ))}
        </fieldset>

        <label className="flex items-center gap-2 text-sm text-muted">
          Sort
          <select
            name="sort"
            defaultValue={state.sort}
            onChange={submit}
            className="select-menu"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        {/* Keep active filters across new searches */}
        {state.type && <input type="hidden" name="type" value={state.type} />}
        {state.minPrice && <input type="hidden" name="minPrice" value={state.minPrice} />}
        {state.maxPrice && <input type="hidden" name="maxPrice" value={state.maxPrice} />}
      </div>
    </Form>
  );
}
