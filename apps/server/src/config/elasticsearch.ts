import { Client, HttpConnection } from '@elastic/elasticsearch';
import { env } from '../utils/env';

export const elastic = new Client({
  node: env.required('ELASTICSEARCH_URL'),
  auth: { apiKey: env.required('ELASTICSEARCH_API_KEY') },
  // The default UndiciConnection crashes under Bun; use node:http instead.
  Connection: HttpConnection,
});
