import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import helmet from 'helmet';
import { router } from './routes';

export const app = express();

app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', router);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error & { status?: number; expose?: boolean }, _req: Request, res: Response, _next: NextFunction) => {
  // Client errors raised by middleware (e.g. malformed JSON body) keep their 4xx status.
  if (err.expose && err.status && err.status < 500) {
    return res.status(err.status).json({ success: false, data: null, error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
