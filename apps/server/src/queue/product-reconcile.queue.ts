import { createQueue } from '../config/bullmq';

export const PRODUCT_RECONCILE_QUEUE = 'product-reconcile';
const RECONCILE_EVERY_MS = 15 * 60 * 1000;

const queue = createQueue(PRODUCT_RECONCILE_QUEUE);

// Upserts the repeating schedule; safe to call from every process (one schedule in Redis).
export async function scheduleProductReconcile() {
  await queue.upsertJobScheduler('reconcile-products', { every: RECONCILE_EVERY_MS }, { name: 'reconcile' });
}
