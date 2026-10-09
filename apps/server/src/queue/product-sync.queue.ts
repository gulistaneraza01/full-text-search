import { createQueue } from '../config/bullmq';

export const PRODUCT_SYNC_QUEUE = 'product-sync';
export const PRODUCT_SYNC_MAX_ATTEMPTS = 5;
const BACKOFF_MS = 1000;

export type ProductSyncJob = { id: string };

const queue = createQueue<ProductSyncJob>(PRODUCT_SYNC_QUEUE);

// Queues Elasticsearch syncs for products. Each job reads the row's current state,
// so jobs are idempotent and order doesn't matter: upsert if it exists, else delete.
export async function enqueueProductSyncs(ids: string[]) {
  if (ids.length === 0) return;
  await queue.addBulk(
    [...new Set(ids)].map((id) => ({
      name: 'sync',
      data: { id },
      opts: {
        attempts: PRODUCT_SYNC_MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: BACKOFF_MS },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    })),
  );
}
