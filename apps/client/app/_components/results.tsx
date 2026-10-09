import Link from "next/link";
import { Highlight } from "./highlight";
import { ALL_ENGINES, hrefFor, PAGE_SIZE, searchEngine, type Engine, type Facets, type SearchResult, type SearchState } from "../_lib/search";

const ENGINE_META: Record<Engine, { label: string; tagline: string; accent: string }> = {
  postgres: { label: "Postgres", tagline: "tsvector · GIN · ts_rank", accent: "var(--pg)" },
  elasticsearch: { label: "Elasticsearch", tagline: "BM25 · synonyms · fuzzy", accent: "var(--es)" },
  opensearch: { label: "OpenSearch", tagline: "BM25 · synonyms · fuzzy", accent: "var(--os)" },
};

const MAX_RESULT_WINDOW = 10_000; // API caps page * pageSize at this

const priceFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const countFmt = new Intl.NumberFormat("en-US");

type Success = { engine: Engine; ok: true; result: SearchResult };
type Outcome = Success | { engine: Engine; ok: false; error: string };

export async function Results({ state }: { state: SearchState }) {
  const engines: Engine[] = state.engine === "all" ? ALL_ENGINES : [state.engine];

  // Query engines in parallel; one failing shouldn't hide the others' results.
  const outcomes: Outcome[] = await Promise.all(
    engines.map(async (engine): Promise<Outcome> => {
      try {
        return { engine, ok: true, result: await searchEngine(engine, state) };
      } catch (err) {
        return { engine, ok: false, error: (err as Error).message };
      }
    }),
  );

  const succeeded = outcomes.filter((o): o is Success => o.ok);
  const fastest = succeeded.length > 1 ? succeeded.reduce((a, b) => (a.result.tookMs <= b.result.tookMs ? a : b)).engine : undefined;
  const facets = succeeded.find((o) => o.result.facets)?.result.facets;
  const maxTotal = Math.max(0, ...succeeded.map((o) => o.result.total));
  const totalPages = Math.min(Math.ceil(maxTotal / PAGE_SIZE), Math.floor(MAX_RESULT_WINDOW / PAGE_SIZE));

  return (
    <div className="grid gap-10 lg:grid-cols-[13rem_1fr]">
      <aside className="order-2 lg:order-1">
        <FacetPanel state={state} facets={facets} />
      </aside>

      <div className="order-1 flex min-w-0 flex-col gap-8 lg:order-2">
        <ActiveFilters state={state} />
        <div className={`grid gap-6 ${engineGridClass(outcomes.length)}`}>
          {outcomes.map((o) => (
            <EngineColumn key={o.engine} outcome={o} isFastest={o.engine === fastest} />
          ))}
        </div>
        {totalPages > 1 && <Pagination state={state} totalPages={totalPages} />}
      </div>
    </div>
  );
}

// Side-by-side columns on wide screens; stacked below that.
export function engineGridClass(count: number) {
  if (count >= 3) return "xl:grid-cols-3";
  return count === 2 ? "xl:grid-cols-2" : "";
}

function EngineColumn({ outcome, isFastest }: { outcome: Outcome; isFastest: boolean }) {
  const meta = ENGINE_META[outcome.engine];

  return (
    <section
      aria-labelledby={`${outcome.engine}-heading`}
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-rule bg-surface"
      style={{ "--accent": meta.accent } as React.CSSProperties}
    >
      <header className="relative flex flex-col gap-3 border-b border-rule px-5 pt-5 pb-4">
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[var(--accent)]" />
        <div>
          <h2 id={`${outcome.engine}-heading`} className="text-lg font-semibold tracking-tight text-ink">
            {meta.label}
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{meta.tagline}</p>
        </div>
        {outcome.ok && (
          <dl className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">Results</dt>
              <dd className="font-mono text-xl tabular-nums text-ink">{countFmt.format(outcome.result.total)}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">Time</dt>
              <dd className="flex items-baseline gap-1.5 font-mono text-xl tabular-nums text-ink">
                {Math.round(outcome.result.tookMs)}
                <span className="text-xs text-muted">ms</span>
                {isFastest && (
                  <span className="ml-1 self-center rounded-full bg-[var(--accent)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                    fastest
                  </span>
                )}
              </dd>
            </div>
          </dl>
        )}
      </header>

      {!outcome.ok ? (
        <p role="alert" className="m-5 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {outcome.error}
        </p>
      ) : outcome.result.hits.length === 0 ? (
        <p className="px-5 py-12 text-center text-muted">No matches.</p>
      ) : (
        <ol className="divide-y divide-rule">
          {outcome.result.hits.map((hit, i) => (
            <li key={hit.id} className="grid grid-cols-[1.75rem_1fr] gap-x-2 px-5 py-4 transition-colors hover:bg-paper/60">
              <span className="pt-0.5 font-mono text-xs tabular-nums text-muted">
                {(outcome.result.page - 1) * outcome.result.pageSize + i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-medium leading-snug text-ink">
                  <Highlight text={hit.highlight.name} fallback={hit.name} />
                </h3>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
                  <Highlight text={hit.highlight.description} fallback={hit.description} />
                </p>
                <p className="mt-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted">
                  <span className="rounded border border-rule px-1.5 py-0.5">{hit.type}</span>
                  <span title="Relevance score">score {hit.score.toFixed(3)}</span>
                  <span className="ml-auto text-sm normal-case tracking-normal tabular-nums text-ink">{priceFmt.format(hit.price)}</span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function FacetPanel({ state, facets }: { state: SearchState; facets?: Facets }) {
  if (!facets) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        Facets come from Elasticsearch/OpenSearch aggregations. Switch to <em>Compare</em>, <em>Elasticsearch</em> or <em>OpenSearch</em> to filter by category and price.
      </p>
    );
  }

  return (
    <nav aria-label="Filters" className="flex flex-col gap-8 lg:sticky lg:top-8">
      <FacetGroup title="Category">
        {facets.types.map((t) => (
          <FacetLink
            key={t.value}
            href={hrefFor(state, { type: state.type === t.value ? undefined : t.value, page: 1 })}
            active={state.type === t.value}
            label={t.value}
            count={t.count}
          />
        ))}
      </FacetGroup>
      <FacetGroup title="Price">
        {facets.priceRanges
          .filter((r) => r.count > 0)
          .map((r) => {
            const min = r.from?.toString();
            const max = r.to?.toString();
            const active = state.minPrice === min && state.maxPrice === max;
            return (
              <FacetLink
                key={r.key}
                href={hrefFor(state, active ? { minPrice: undefined, maxPrice: undefined, page: 1 } : { minPrice: min, maxPrice: max, page: 1 })}
                active={active}
                label={priceRangeLabel(r.from, r.to)}
                count={r.count}
              />
            );
          })}
      </FacetGroup>
    </nav>
  );
}

function priceRangeLabel(from?: number, to?: number) {
  if (from === undefined && to !== undefined) return `Under ${priceFmt.format(to)}`;
  if (to === undefined && from !== undefined) return `${priceFmt.format(from)}+`;
  return `${priceFmt.format(from ?? 0)} – ${priceFmt.format(to ?? 0)}`;
}

function FacetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">{title}</h2>
      <ul className="flex flex-col">{children}</ul>
    </div>
  );
}

function FacetLink({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "true" : undefined}
        className={`-mx-2 flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ink ${active ? "bg-ink text-paper" : "text-ink hover:bg-surface"}`}
      >
        <span className="truncate">{label}</span>
        <span className={`font-mono text-xs tabular-nums ${active ? "text-paper/70" : "text-muted"}`}>{countFmt.format(count)}</span>
      </Link>
    </li>
  );
}

function ActiveFilters({ state }: { state: SearchState }) {
  const chips: { label: string; href: string }[] = [];
  if (state.type) chips.push({ label: state.type, href: hrefFor(state, { type: undefined, page: 1 }) });
  if (state.minPrice || state.maxPrice) {
    chips.push({
      label: priceRangeLabel(state.minPrice ? Number(state.minPrice) : undefined, state.maxPrice ? Number(state.maxPrice) : undefined),
      href: hrefFor(state, { minPrice: undefined, maxPrice: undefined, page: 1 }),
    });
  }
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Filtered by</span>
      {chips.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          aria-label={`Remove filter ${c.label}`}
          className="group flex items-center gap-1.5 rounded-full border border-ink px-3 py-1 text-sm text-ink transition hover:bg-ink hover:text-paper"
        >
          {c.label}
          <span aria-hidden className="text-muted group-hover:text-paper">
            ×
          </span>
        </Link>
      ))}
    </div>
  );
}

function Pagination({ state, totalPages }: { state: SearchState; totalPages: number }) {
  const page = Math.min(state.page, totalPages);
  const linkClass = "rounded-full border border-rule px-4 py-2 text-sm text-ink transition hover:border-ink focus-visible:outline-2 focus-visible:outline-ink";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={hrefFor(state, { page: page - 1 })} className={linkClass}>
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="font-mono text-xs tabular-nums text-muted">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(state, { page: page + 1 })} className={linkClass}>
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
