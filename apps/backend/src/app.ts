import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import quotationRoutes from './routes/quotations';
import proformaRoutes from './routes/proformaInvoices';
import finalInvoiceRoutes from './routes/finalInvoices';
import clientRoutes from './routes/clients';
import conversionRoutes from './routes/conversions';

const app = express();

app.use(cors());
app.use(express.json());

// Root Landing Route
app.get('/', (req: Request, res: Response) => {
  res.send('My Billing Backend API is running successfully!');
});

// Root API Healthcheck
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// App Routes
app.use('/api/quotations', quotationRoutes);
app.use('/api/proforma-invoices', proformaRoutes);
app.use('/api/final-invoices', finalInvoiceRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/convert', conversionRoutes);

// Global Error Handler Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  
  if (err && err.name === 'ZodError') {
    res.status(400).json({
      message: 'Validation Error',
      errors: err.errors || err,
    });
    return;
  }

  res.status(500).json({
    message: err.message || 'An internal server error occurred',
    error: process.env.NODE_ENV === 'production' ? {} : err,
  });
});

export default app;
