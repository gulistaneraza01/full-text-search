import type { estypes } from '@elastic/elasticsearch';

// Facets shown next to search results. Brand isn't a stored field yet.
export const productAggregations: Record<string, estypes.AggregationsAggregationContainer> = {
  types: { terms: { field: 'type', size: 20 } },
  price_ranges: {
    range: {
      field: 'price',
      ranges: [
        { key: 'under-25', to: 25 },
        { key: '25-50', from: 25, to: 50 },
        { key: '50-100', from: 50, to: 100 },
        { key: '100-250', from: 100, to: 250 },
        { key: '250-500', from: 250, to: 500 },
        { key: '500-plus', from: 500 },
      ],
    },
  },
};
