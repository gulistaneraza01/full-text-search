// Rebuilds the OpenSearch products index from Postgres (source of truth).
// Doesn't touch Postgres or Elasticsearch. Usage: bun run opensearch:backfill
import { prisma } from '../src/config/prisma';
import { bulkIndexOsProducts, recreateOsProductIndex } from '../src/services/product-os-index.service';

const BATCH_SIZE = 1000;

async function main() {
  await recreateOsProductIndex();

  let cursor: string | undefined;
  let done = 0;
  for (;;) {
    const rows = await prisma.products.findMany({
      select: { id: true, name: true, description: true, type: true, price: true, createdAt: true, modifiedAt: true },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    if (rows.length === 0) break;

    await bulkIndexOsProducts(rows);
    done += rows.length;
    cursor = rows.at(-1)!.id;
    console.log(`Indexed ${done} products into OpenSearch`);
  }
}

main()
  .catch((err) => {
    console.error('OpenSearch backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
