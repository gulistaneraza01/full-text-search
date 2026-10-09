import { createQueue } from '../config/bullmq';

export const PRODUCT_SYNC_QUEUE = 'product-sync';
export const PRODUCT_SYNC_MAX_ATTEMPTS = 5;
const BACKOFF_MS = 1000;

export type ProductSyncJob = { id: string };

const queue = createQueue<ProductSyncJob>(PRODUCT_SYNC_QUEUE);

// Queues an Elasticsearch sync for one product. The job reads the row's current
// state, so it's idempotent and order doesn't matter: upsert if it exists, else delete.
export async function enqueueProductSync(id: string) {
  await queue.add('sync', { id }, {
    attempts: PRODUCT_SYNC_MAX_ATTEMPTS,
    backoff: { type: 'exponential', delay: BACKOFF_MS },
    removeOnComplete: true,
    removeOnFail: 1000,
  });
}
