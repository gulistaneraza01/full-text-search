import { Client } from '@opensearch-project/opensearch';
import { env } from '../utils/env';

// Service URI includes credentials (https://user:pass@host:port), as provided by Aiven.
export const opensearch = new Client({ node: env.required('OPENSEARCH_SERVICE_URI') });
