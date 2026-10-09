export const ENGINES = ["both", "postgres", "elasticsearch"] as const;
export type EngineChoice = (typeof ENGINES)[number];
export type Engine = Exclude<EngineChoice, "both">;

export const SORTS = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "newest", label: "Newest" },
] as const;

export type SearchState = {
  q: string;
  engine: EngineChoice;
  sort: string;
  type?: string;
  minPrice?: string;
  maxPrice?: string;
  page: number;
};

export type Hit = {
  id: string;
  name: string;
  description: string;
  type: string;
  price: number;
  score: number;
  highlight: { name?: string; description?: string };
};

export type Facets = {
  types: { value: string; count: number }[];
  priceRanges: { key: string; from?: number; to?: number; count: number }[];
};

export type SearchResult = {
  engine: Engine;
  tookMs: number;
  total: number;
  page: number;
  pageSize: number;
  hits: Hit[];
  facets?: Facets;
};

export type Suggestion = { id: string; name: string; type: string };

type Envelope<T> = { success: boolean; data: T | null; error: string | null };

const API_URL = process.env.API_URL ?? "http://localhost:8000";
export const PAGE_SIZE = 10;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

// Reads the page's URL search params into a normalized search state.
export function parseSearchState(sp: Record<string, string | string[] | undefined>): SearchState {
  const engine = first(sp.engine);
  const page = Number(first(sp.page));
  return {
    q: first(sp.q) ?? "",
    engine: ENGINES.includes(engine as EngineChoice) ? (engine as EngineChoice) : "both",
    sort: first(sp.sort) ?? "relevance",
    type: first(sp.type),
    minPrice: first(sp.minPrice),
    maxPrice: first(sp.maxPrice),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

// Builds a page URL from the current state plus overrides (undefined removes a param).
export function hrefFor(state: SearchState, overrides: Partial<Record<keyof SearchState, string | number | undefined>> = {}) {
  const merged: Record<string, string | number | undefined> = { ...state, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === "") continue;
    if (key === "engine" && value === "both") continue;
    if (key === "sort" && value === "relevance") continue;
    if (key === "page" && value === 1) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

// Server-side call to the Express search API for one engine.
export async function searchEngine(engine: Engine, state: SearchState): Promise<SearchResult> {
  const params = new URLSearchParams({ q: state.q, sort: state.sort, page: String(state.page), pageSize: String(PAGE_SIZE) });
  if (state.type) params.set("type", state.type);
  if (state.minPrice) params.set("minPrice", state.minPrice);
  if (state.maxPrice) params.set("maxPrice", state.maxPrice);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/search/${engine}?${params}`);
  } catch {
    throw new Error(`Can't reach the search API at ${API_URL}. Is the server running?`);
  }
  const body = (await res.json().catch(() => null)) as Envelope<SearchResult> | null;
  if (!res.ok || !body?.success || !body.data) {
    throw new Error(body?.error ?? `Search failed (HTTP ${res.status})`);
  }
  return body.data;
}
