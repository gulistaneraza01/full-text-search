import { elastic } from '../config/elasticsearch';
import { prisma } from '../config/prisma';
import { enqueueProductSyncs } from '../queue/product-sync.queue';
import { PRODUCTS_INDEX } from '../search/indices/products.mapping';

const BATCH_SIZE = 1000;
const PIT_KEEP_ALIVE = '2m';

// Postgres → ES: queue a sync for products missing from ES or whose modifiedAt differs.
async function findMissingOrStale() {
  let queued = 0;
  let cursor: string | undefined;

  for (;;) {
    const rows = await prisma.products.findMany({
      select: { id: true, modifiedAt: true },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    if (rows.length === 0) return queued;

    const { docs } = await elastic.mget<{ modifiedAt: string }>({
      index: PRODUCTS_INDEX,
      ids: rows.map((r) => r.id),
      _source: ['modifiedAt'],
    });
    const outOfSync = rows.filter((row, i) => {
      const doc = docs[i];
      const found = doc && 'found' in doc && doc.found;
      return !found || new Date(doc._source!.modifiedAt).getTime() !== row.modifiedAt.getTime();
    });

    await enqueueProductSyncs(outOfSync.map((r) => r.id));
    queued += outOfSync.length;
    cursor = rows.at(-1)!.id;
  }
}

// ES → Postgres: queue a sync (which deletes) for ES docs whose product no longer exists.
async function findOrphans() {
  let queued = 0;
  const pit = await elastic.openPointInTime({ index: PRODUCTS_INDEX, keep_alive: PIT_KEEP_ALIVE });
  try {
    let searchAfter: (string | number)[] | undefined;
    for (;;) {
      const res = await elastic.search({
        pit: { id: pit.id, keep_alive: PIT_KEEP_ALIVE },
        size: BATCH_SIZE,
        sort: ['_shard_doc'],
        _source: false,
        ...(searchAfter && { search_after: searchAfter }),
      });
      const hits = res.hits.hits;
      if (hits.length === 0) return queued;

      const ids = hits.map((h) => h._id!);
      const existing = await prisma.products.findMany({ where: { id: { in: ids } }, select: { id: true } });
      const existingIds = new Set(existing.map((p) => p.id));
      const orphans = ids.filter((id) => !existingIds.has(id));

      await enqueueProductSyncs(orphans);
      queued += orphans.length;
      searchAfter = hits.at(-1)!.sort as (string | number)[];
    }
  } finally {
    await elastic.closePointInTime({ id: pit.id }).catch(() => {});
  }
}

// Compares Postgres (source of truth) with Elasticsearch and queues repairs.
// Safe to run any time: it only enqueues idempotent sync jobs.
export async function reconcileProducts() {
  const [missingOrStale, orphans] = await Promise.all([findMissingOrStale(), findOrphans()]);
  return { missingOrStale, orphans };
}
