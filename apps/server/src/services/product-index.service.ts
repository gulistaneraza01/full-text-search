import { elastic } from '../config/elasticsearch';
import {
  PRODUCTS_INDEX,
  productMappings,
  productSettings,
} from '../search/indices/products.mapping';

export type ProductDoc = {
  id: string;
  name: string;
  description: string;
  type: string;
  price: number;
  createdAt: Date;
  modifiedAt: Date;
};

// Creates the products index if missing; otherwise adds any new fields to it.
// Analyzer/settings changes can't be applied in place: use recreateProductIndex.
export async function createProductIndex() {
  if (await elastic.indices.exists({ index: PRODUCTS_INDEX })) {
    await elastic.indices.putMapping({ index: PRODUCTS_INDEX, ...productMappings });
    return;
  }
  await elastic.indices.create({
    index: PRODUCTS_INDEX,
    settings: productSettings,
    mappings: productMappings,
  });
}

// Drops all indexed products; re-index from Postgres afterwards.
export async function recreateProductIndex() {
  await elastic.indices.delete({ index: PRODUCTS_INDEX }, { ignore: [404] });
  await createProductIndex();
}

const toSource = ({ id, ...rest }: ProductDoc) => rest;

export async function indexProduct(product: ProductDoc) {
  await elastic.index({
    index: PRODUCTS_INDEX,
    id: product.id,
    document: toSource(product),
  });
}

export async function deleteProduct(id: string) {
  await elastic.delete({ index: PRODUCTS_INDEX, id }, { ignore: [404] });
}

// Bulk-indexes products; throws if any item failed.
export async function bulkIndexProducts(products: ProductDoc[]) {
  if (products.length === 0) return;

  const operations = products.flatMap((p) => [
    { index: { _index: PRODUCTS_INDEX, _id: p.id } },
    toSource(p),
  ]);
  const result = await elastic.bulk({ operations });

  if (result.errors) {
    const failed = result.items.filter((i) => i.index?.error);
    throw new Error(
      `Bulk index failed for ${failed.length} products: ${JSON.stringify(failed[0]?.index?.error)}`,
    );
  }
}
