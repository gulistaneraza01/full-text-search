import { app } from './src/app';
import { startProductSyncWorker } from './src/worker/product-sync.worker';
import { env } from './src/utils/env';

// Keeps Elasticsearch in sync with product writes (runs in-process).
startProductSyncWorker();

app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});
