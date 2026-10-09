import type { estypes } from '@elastic/elasticsearch';

export const PRODUCTS_INDEX = 'products';

// Applied at search time only (synonym_graph can't be used at index time).
const SYNONYMS = [
  'earbuds, earphones, in ear headphones',
  'headphones, headset',
  'sneakers, trainers, tennis shoes',
  't-shirt, tee, tshirt',
  'hoodie, sweatshirt',
  'sweater, jumper, pullover',
  'jacket, coat',
  'skillet, frying pan, pan',
  'rug, carpet',
  'lamp, light',
  'power bank, portable charger',
  'monitor, display, screen',
  'tent, shelter',
];

export const productSettings: estypes.IndicesIndexSettings = {
  analysis: {
    filter: {
      english_stemmer: { type: 'stemmer', language: 'english' },
      product_synonyms: { type: 'synonym_graph', synonyms: SYNONYMS },
      autocomplete_edge: { type: 'edge_ngram', min_gram: 2, max_gram: 20 },
    },
    analyzer: {
      product_text: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'asciifolding', 'english_stemmer'],
      },
      product_search: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'asciifolding', 'product_synonyms', 'english_stemmer'],
      },
      autocomplete: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'asciifolding', 'autocomplete_edge'],
      },
      autocomplete_search: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'asciifolding'],
      },
    },
  },
};

export const productMappings: estypes.MappingTypeMapping = {
  properties: {
    name: {
      type: 'text',
      analyzer: 'product_text',
      search_analyzer: 'product_search',
      fields: {
        keyword: { type: 'keyword' }, // exact match / sorting
        // unstemmed, for typo-tolerant (fuzzy) matching
        plain: { type: 'text', analyzer: 'autocomplete_search' },
        autocomplete: {
          type: 'text',
          analyzer: 'autocomplete',
          search_analyzer: 'autocomplete_search',
        },
      },
    },
    description: {
      type: 'text',
      analyzer: 'product_text',
      search_analyzer: 'product_search',
    },
    type: { type: 'keyword' },
    price: { type: 'float' },
    createdAt: { type: 'date' },
    modifiedAt: { type: 'date' },
  },
};
