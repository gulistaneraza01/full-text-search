import { createWorker } from '../config/bullmq';
import { PRODUCT_RECONCILE_QUEUE } from '../queue/product-reconcile.queue';
import { reconcileProducts } from '../services/product-reconcile.service';

export function startProductReconcileWorker() {
  const worker = createWorker(PRODUCT_RECONCILE_QUEUE, async () => {
    const result = await reconcileProducts();
    if (result.missingOrStale || result.orphans) {
      console.warn('product reconcile found drift, repairs queued:', result);
    }
    return result;
  });

  worker.on('failed', (_job, err) => console.error('product reconcile failed:', err.message));
  return worker;
}
