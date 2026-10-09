import { app } from './src/app';
import { scheduleProductReconcile } from './src/queue/product-reconcile.queue';
import { env } from './src/utils/env';
import { startOutboxRelay } from './src/worker/outbox-relay.worker';
import { startProductReconcileWorker } from './src/worker/product-reconcile.worker';
import { startProductSyncWorker } from './src/worker/product-sync.worker';

// Keeps Elasticsearch in sync with Postgres (runs in-process):
// products trigger → product_outbox → relay → product-sync queue → worker → ES,
// plus a periodic reconcile that repairs any drift.
startOutboxRelay();
startProductSyncWorker();
startProductReconcileWorker();
await scheduleProductReconcile();

app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});
