const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const orgRoutes = require('./routes/org.routes');
const customerRoutes = require('./routes/customer.routes');
const transactionRoutes = require('./routes/transaction.routes');
const interestRoutes = require('./routes/interest.routes');
const reminderRoutes = require('./routes/reminder.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const { authMiddleware } = require('./middlewares/auth.middleware');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orgs', authMiddleware, orgRoutes);
app.use('/api/orgs/:orgId/customers', authMiddleware, customerRoutes);
app.use('/api/orgs/:orgId/transactions', authMiddleware, transactionRoutes);
app.use(
  '/api/orgs/:orgId/customers/:customerId/interest',
  authMiddleware,
  interestRoutes
);
app.use('/api/orgs/:orgId', authMiddleware, reminderRoutes);
app.use('/api/orgs/:orgId/dashboard', authMiddleware, dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

module.exports = app;

