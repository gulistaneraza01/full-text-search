import { opensearch } from '../config/opensearch';
import { PRODUCTS_INDEX, productMappings, productSettings } from '../search/indices/products.mapping';
import type { ProductDoc } from './product-index.service';

// OpenSearch mirror of product-index.service.ts. Reuses the Elasticsearch settings/mappings:
// the analyzers, synonyms and field types are compatible.

// Creates the index if missing; otherwise adds any new fields to it.
export async function createOsProductIndex() {
  const { body: exists } = await opensearch.indices.exists({ index: PRODUCTS_INDEX });
  if (exists) {
    await opensearch.indices.putMapping({ index: PRODUCTS_INDEX, body: productMappings as never });
    return;
  }
  await opensearch.indices.create({
    index: PRODUCTS_INDEX,
    body: { settings: productSettings, mappings: productMappings } as never,
  });
}

// Drops all indexed products; re-index from Postgres afterwards.
export async function recreateOsProductIndex() {
  await opensearch.indices.delete({ index: PRODUCTS_INDEX }, { ignore: [404] });
  await createOsProductIndex();
}

const toSource = ({ id, ...rest }: ProductDoc) => rest;

export async function indexOsProduct(product: ProductDoc) {
  await opensearch.index({ index: PRODUCTS_INDEX, id: product.id, body: toSource(product) });
}

export async function deleteOsProduct(id: string) {
  await opensearch.delete({ index: PRODUCTS_INDEX, id }, { ignore: [404] });
}

// Bulk-indexes products; throws if any item failed.
export async function bulkIndexOsProducts(products: ProductDoc[]) {
  if (products.length === 0) return;
  const body = products.flatMap((p) => [{ index: { _index: PRODUCTS_INDEX, _id: p.id } }, toSource(p)]);
  const { body: result } = await opensearch.bulk({ body });

  if (result.errors) {
    const failed = result.items.filter((i) => i.index?.error);
    throw new Error(`OpenSearch bulk index failed for ${failed.length} products: ${JSON.stringify(failed[0]?.index?.error)}`);
  }
}
