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

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
