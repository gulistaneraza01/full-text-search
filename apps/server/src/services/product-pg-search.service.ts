import { prisma } from '../config/prisma';
import { HL_END, HL_START, type SearchParams } from '../utils/search-params';
import type { SearchHit } from './search.types';

const HEADLINE_OPTIONS = `StartSel=${HL_START}, StopSel=${HL_END}, HighlightAll=true`;

// Postgres full-text search over the generated "search_vector" column (GIN-indexed).
// websearch_to_tsquery accepts user syntax: "quoted phrases", OR, -exclude.
// Values are bound as parameters by $queryRaw, so this is injection-safe.
export async function searchProductsPg({ q, type, minPrice, maxPrice, sort, page, pageSize }: SearchParams) {
  const offset = (page - 1) * pageSize;

  const rows = await prisma.$queryRaw<
    (Omit<SearchHit, 'highlight'> & { nameHl: string; descriptionHl: string; total: bigint })[]
  >`
    SELECT id, name, description, type, price,
           ts_rank(search_vector, query) AS score,
           ts_headline('english', name, query, ${HEADLINE_OPTIONS}) AS "nameHl",
           ts_headline('english', description, query, ${HEADLINE_OPTIONS}) AS "descriptionHl",
           count(*) OVER () AS total
    FROM products, websearch_to_tsquery('english', ${q}) AS query
    WHERE search_vector @@ query
      AND (${type ?? null}::text IS NULL OR type = ${type ?? null})
      AND (${minPrice ?? null}::float8 IS NULL OR price >= ${minPrice ?? null})
      AND (${maxPrice ?? null}::float8 IS NULL OR price <= ${maxPrice ?? null})
    ORDER BY
      CASE WHEN ${sort} = 'price_asc' THEN price END ASC,
      CASE WHEN ${sort} = 'price_desc' THEN price END DESC,
      CASE WHEN ${sort} = 'newest' THEN "createdAt" END DESC,
      score DESC, "createdAt" DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  return {
    total: Number(rows[0]?.total ?? 0),
    hits: rows.map(({ total, nameHl, descriptionHl, ...hit }): SearchHit => ({
      ...hit,
      highlight: { name: nameHl, description: descriptionHl },
    })),
  };
}
