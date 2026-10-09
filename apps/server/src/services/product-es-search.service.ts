import type { estypes } from '@elastic/elasticsearch';
import { elastic } from '../config/elasticsearch';
import { buildProductSearch } from '../search/queries/productSearch';
import { buildProductSuggest } from '../search/queries/productSuggest';
import type { SearchParams } from '../utils/search-params';
import type { ProductDoc } from './product-index.service';
import type { SearchHit } from './search.types';

export type ProductSource = Omit<ProductDoc, 'id'>;
type Bucket = { key: string; doc_count: number; from?: number; to?: number };
export type Aggs = {
  types: estypes.AggregationsMultiBucketAggregateBase<Bucket>;
  price_ranges: estypes.AggregationsMultiBucketAggregateBase<Bucket>;
};

const buckets = (
  agg: estypes.AggregationsMultiBucketAggregateBase<Bucket> | undefined,
) => (Array.isArray(agg?.buckets) ? agg.buckets : []);

// Maps an Elasticsearch/OpenSearch search response (same shape) to the API's result.
export function toSearchResult(res: estypes.SearchResponse<ProductSource, Aggs>) {
  const total = typeof res.hits.total === 'number' ? res.hits.total : (res.hits.total?.value ?? 0);

  return {
    total,
    hits: res.hits.hits.map(
      (h): SearchHit => ({
        id: h._id!,
        name: h._source!.name,
        description: h._source!.description,
        type: h._source!.type,
        price: h._source!.price,
        score: h._score ?? 0,
        highlight: { name: h.highlight?.name?.[0], description: h.highlight?.description?.[0] },
      }),
    ),
    facets: {
      types: buckets(res.aggregations?.types).map((b) => ({ value: b.key, count: b.doc_count })),
      priceRanges: buckets(res.aggregations?.price_ranges).map((b) => ({
        key: b.key,
        from: b.from,
        to: b.to,
        count: b.doc_count,
      })),
    },
  };
}

export async function searchProductsEs(params: SearchParams) {
  return toSearchResult(await elastic.search<ProductSource, Aggs>(buildProductSearch(params)));
}

export async function suggestProductsEs(prefix: string) {
  const res = await elastic.search<Pick<ProductSource, 'name' | 'type'>>(
    buildProductSuggest(prefix),
  );
  console.log({ res: res.hits.hits });
  return res.hits.hits.map((h) => ({
    id: h._id!,
    name: h._source!.name,
    type: h._source!.type,
  }));
}
