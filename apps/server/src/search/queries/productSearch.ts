import type { estypes } from '@elastic/elasticsearch';
import { HL_END, HL_START } from '../../utils/search-params';
import { PRODUCTS_INDEX } from '../indices/products.mapping';
import { productAggregations } from './aggregations';

export type ProductSort = 'relevance' | 'price_asc' | 'price_desc' | 'newest';

export type ProductSearchParams = {
  q?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
};

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

const SORTS: Record<ProductSort, estypes.SortCombinations[]> = {
  relevance: ['_score', { createdAt: 'desc' }],
  price_asc: [{ price: 'asc' }],
  price_desc: [{ price: 'desc' }],
  newest: [{ createdAt: 'desc' }],
};

export function buildProductSearch({
  q,
  type,
  minPrice,
  maxPrice,
  sort = 'relevance',
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}: ProductSearchParams): estypes.SearchRequest {
  const size = Math.min(Math.max(1, Math.floor(pageSize)), MAX_PAGE_SIZE);
  const from = (Math.max(1, Math.floor(page)) - 1) * size;

  const filter: estypes.QueryDslQueryContainer[] = [];
  if (type) filter.push({ term: { type } });
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.push({ range: { price: { gte: minPrice, lte: maxPrice } } });
  }

  const text = q?.trim();
  // Stemmed + synonyms clause, or a fuzzy clause on unstemmed names for typos
  // (fuzziness on stemmed tokens misses: "wireles" stems to "wirel").
  const must: estypes.QueryDslQueryContainer[] = text
    ? [
        {
          bool: {
            should: [
              {
                multi_match: {
                  query: text,
                  fields: ['name^3', 'description^2', 'type'],
                  operator: 'and',
                },
              },
              {
                match: {
                  'name.plain': {
                    query: text,
                    fuzziness: 'AUTO',
                    operator: 'and',
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      ]
    : [{ match_all: {} }];

  return {
    index: PRODUCTS_INDEX,
    from,
    size,
    query: { bool: { must, filter } },
    sort: SORTS[sort],
    aggs: productAggregations,
    track_total_hits: true,
    // number_of_fragments: 0 returns the whole field with matches marked.
    highlight: {
      pre_tags: [HL_START],
      post_tags: [HL_END],
      fields: {
        name: { number_of_fragments: 0 },
        description: { number_of_fragments: 0 },
      },
    },
  };
}
