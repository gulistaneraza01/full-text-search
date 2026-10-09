import type { estypes } from '@elastic/elasticsearch';
import { PRODUCTS_INDEX } from '../indices/products.mapping';

const DEFAULT_SUGGEST_SIZE = 8;

// Prefix autocomplete on product names ("wir ear" -> "Acme Wireless Earbuds").
export function buildProductSuggest(
  prefix: string,
  size = DEFAULT_SUGGEST_SIZE,
): estypes.SearchRequest {
  return {
    index: PRODUCTS_INDEX,
    size,
    _source: ['name', 'type'],
    query: {
      match: { 'name.autocomplete': { query: prefix.trim(), operator: 'and' } },
    },
  };
}
