import type { Request } from 'express';

export const SORTS = ['relevance', 'price_asc', 'price_desc', 'newest'] as const;
export type Sort = (typeof SORTS)[number];

export type SearchParams = {
  q: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  sort: Sort;
  page: number;
  pageSize: number;
};

// Highlight markers wrapped around matched terms (control chars never appear in product text).
export const HL_START = '\u0002';
export const HL_END = '\u0003';

const MAX_Q_LENGTH = 200;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const MAX_RESULT_WINDOW = 10_000; // ES default index.max_result_window

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined);

function num(v: unknown, name: string): Result<number | undefined> {
  const s = str(v);
  if (!s) return { ok: true, value: undefined };
  const n = Number(s);
  return Number.isFinite(n) && n >= 0
    ? { ok: true, value: n }
    : { ok: false, error: `${name} must be a non-negative number` };
}

function int(v: unknown, name: string, fallback: number, max: number): Result<number> {
  const s = str(v);
  if (!s) return { ok: true, value: fallback };
  const n = Number(s);
  return Number.isInteger(n) && n >= 1 && n <= max
    ? { ok: true, value: n }
    : { ok: false, error: `${name} must be an integer between 1 and ${max}` };
}

// Validates search query-string params at the API boundary.
export function parseSearchParams(query: Request['query']): Result<SearchParams> {
  const q = str(query.q);
  if (!q) return { ok: false, error: 'q is required' };
  if (q.length > MAX_Q_LENGTH) return { ok: false, error: `q must be at most ${MAX_Q_LENGTH} characters` };

  const sort = str(query.sort) || 'relevance';
  if (!SORTS.includes(sort as Sort)) return { ok: false, error: `sort must be one of: ${SORTS.join(', ')}` };

  const minPrice = num(query.minPrice, 'minPrice');
  if (!minPrice.ok) return minPrice;
  const maxPrice = num(query.maxPrice, 'maxPrice');
  if (!maxPrice.ok) return maxPrice;
  if (minPrice.value !== undefined && maxPrice.value !== undefined && minPrice.value > maxPrice.value) {
    return { ok: false, error: 'minPrice must be less than or equal to maxPrice' };
  }

  const pageSize = int(query.pageSize, 'pageSize', DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  if (!pageSize.ok) return pageSize;
  const page = int(query.page, 'page', 1, Math.floor(MAX_RESULT_WINDOW / pageSize.value));
  if (!page.ok) return page;

  return {
    ok: true,
    value: {
      q,
      type: str(query.type) || undefined,
      minPrice: minPrice.value,
      maxPrice: maxPrice.value,
      sort: sort as Sort,
      page: page.value,
      pageSize: pageSize.value,
    },
  };
}
