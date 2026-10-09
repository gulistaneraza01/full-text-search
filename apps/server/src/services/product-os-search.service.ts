import type { estypes } from '@elastic/elasticsearch';
import { opensearch } from '../config/opensearch';
import { buildProductSearch } from '../search/queries/productSearch';
import type { SearchParams } from '../utils/search-params';
import { toSearchResult, type Aggs, type ProductSource } from './product-es-search.service';

// Same query as Elasticsearch: the DSL used by buildProductSearch is OpenSearch-compatible.
// OpenSearch's client takes the request as { index, body } instead of top-level fields.
export async function searchProductsOs(params: SearchParams) {
  const { index, ...body } = buildProductSearch(params);
  const { body: res } = await opensearch.search({ index: index as string, body: body as never });
  return toSearchResult(res as unknown as estypes.SearchResponse<ProductSource, Aggs>);
}
