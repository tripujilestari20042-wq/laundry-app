import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import servicesRouter from './routes/services';
import ordersRouter from './routes/orders';
import configRouter from './routes/config';
import authRouter from './routes/auth';
import storeRouter from './routes/store';
import paymentsRouter from './routes/payments';
import adminUsersRouter from './routes/admin/users';
import adminDashboardRouter from './routes/admin/dashboard';
import adminReportsRouter from './routes/admin/reports';
import notificationsRouter from './routes/notifications';

const app = express();

app.use(helmet());
const LOCAL_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (LOCAL_ORIGINS.includes(origin)) return true;
  if (origin === config.frontendUrl) return true;
  // Vercel production & preview deployments
  if (/^https:\/\/[\w-]+\.vercel\.app$/.test(origin)) return true;
  // Extra origins from env: CORS_ORIGINS=https://a.com,https://b.com
  const extra = process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  return extra.includes(origin);
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/services', servicesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/config', configRouter);
app.use('/api/store', storeRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/dashboard', adminDashboardRouter);
app.use('/api/admin/reports', adminReportsRouter);
app.use('/api/notifications', notificationsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const host = process.env.HOST || '0.0.0.0';

app.listen(config.port, host, () => {
  console.log(`🚀 Laundry API running on http://${host}:${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Frontend URL: ${config.frontendUrl}`);
});

export default app;
