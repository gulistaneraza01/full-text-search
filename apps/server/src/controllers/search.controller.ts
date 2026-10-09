import type { Request, Response } from 'express';
import { searchProductsEs, suggestProductsEs } from '../services/product-es-search.service';
import { searchProductsOs } from '../services/product-os-search.service';
import { searchProductsPg } from '../services/product-pg-search.service';
import { parseSearchParams, type SearchParams } from '../utils/search-params';

const MAX_SUGGEST_LENGTH = 100;

const fail = (res: Response, status: number, error: string) =>
  res.status(status).json({ success: false, data: null, error });

// Validates params, runs the search, and reports round-trip time to the engine.
function searchHandler<T>(engine: 'postgres' | 'elasticsearch' | 'opensearch', search: (p: SearchParams) => Promise<T>) {
  return async (req: Request, res: Response) => {
    const params = parseSearchParams(req.query);
    if (!params.ok) return fail(res, 400, params.error);

    const start = performance.now();
    const result = await search(params.value);
    const tookMs = Math.round((performance.now() - start) * 10) / 10;

    res.json({
      success: true,
      data: { engine, tookMs, page: params.value.page, pageSize: params.value.pageSize, ...result },
      error: null,
    });
  };
}

export const searchPostgres = searchHandler('postgres', searchProductsPg);
export const searchElasticsearch = searchHandler('elasticsearch', searchProductsEs);
export const searchOpensearch = searchHandler('opensearch', searchProductsOs);

export async function suggest(req: Request, res: Response) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) return res.json({ success: true, data: [], error: null });
  if (q.length > MAX_SUGGEST_LENGTH) return fail(res, 400, `q must be at most ${MAX_SUGGEST_LENGTH} characters`);

  res.json({ success: true, data: await suggestProductsEs(q), error: null });
}
