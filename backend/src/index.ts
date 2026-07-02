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
app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
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

app.listen(config.port, () => {
  console.log(`🚀 Laundry API running on http://localhost:${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
});

export default app;
