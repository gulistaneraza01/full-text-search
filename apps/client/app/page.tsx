import { Suspense } from "react";
import { Results } from "./_components/results";
import { SearchForm } from "./_components/search-form";
import { parseSearchState } from "./_lib/search";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 pt-10 pb-20 sm:px-8 lg:pt-16">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Full-text search · 10,000 products</p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          <span className="text-[var(--pg)]">Postgres</span> <span className="font-light text-muted">vs</span>{" "}
          <span className="text-[var(--es)]">Elasticsearch</span>
        </h1>
        <p className="max-w-xl text-muted">
          One query, two engines. Compare relevance, typo tolerance, synonyms and speed on the same catalogue.
        </p>
      </header>

      <Suspense fallback={<SearchFormSkeleton />}>
        <SearchArea searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SearchArea({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const state = parseSearchState(await searchParams);

  return (
    <>
      <SearchForm key={state.q} state={state} />
      {state.q ? (
        // Keyed so a new search shows the skeleton instead of stale results.
        <Suspense key={JSON.stringify(state)} fallback={<ResultsSkeleton engines={state.engine === "both" ? 2 : 1} />}>
          <Results state={state} />
        </Suspense>
      ) : (
        <EmptyState />
      )}
    </>
  );
}

function EmptyState() {
  const ideas: { q: string; note: string }[] = [
    { q: "wireless earbuds", note: "plain match" },
    { q: "skilet", note: "typo — only ES fuzzy finds it" },
    { q: "trainers", note: "synonym of sneakers in ES" },
    { q: '"cast iron" -red', note: "phrase + exclude in Postgres" },
  ];
  return (
    <section aria-label="Example searches" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ideas.map((idea) => (
        <a
          key={idea.q}
          href={`/?q=${encodeURIComponent(idea.q)}`}
          className="group rounded-2xl border border-rule bg-surface p-5 transition hover:-translate-y-0.5 hover:border-ink focus-visible:outline-2 focus-visible:outline-ink"
        >
          <p className="font-mono text-sm text-ink">{idea.q}</p>
          <p className="mt-1 text-sm text-muted">{idea.note}</p>
          <p aria-hidden className="mt-4 font-mono text-xs text-muted transition group-hover:translate-x-1 group-hover:text-ink">
            Search →
          </p>
        </a>
      ))}
    </section>
  );
}

function SearchFormSkeleton() {
  return <div className="h-[7.5rem] animate-pulse rounded-2xl bg-surface" />;
}

function ResultsSkeleton({ engines }: { engines: number }) {
  return (
    <div role="status" aria-label="Searching" className="grid gap-10 lg:grid-cols-[13rem_1fr]">
      <div className="hidden lg:block" />
      <div className={`grid gap-6 ${engines > 1 ? "xl:grid-cols-2" : ""}`}>
        {Array.from({ length: engines }, (_, i) => (
          <div key={i} className="h-[32rem] animate-pulse rounded-2xl border border-rule bg-surface" />
        ))}
      </div>
    </div>
  );
}
