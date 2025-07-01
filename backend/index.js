require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { setupCompaniesTable, getCompanyByLoginId, getDbPoolByUrl, ensureCompanyTables } = require('./database');

// Import routes
const productsRouter = require('./routes/products');
const transactionsRouter = require('./routes/transactions');
const customersRouter = require('./routes/customers');
const vendorsRouter = require('./routes/vendors');

const app = express();
const frontendUrl = process.env.FRONTEND_URL; // Get frontend URL from .env
const allowedOrigins = [
  'http://localhost:8080', // React default
  'http://localhost:5173', // Vite default
  'http://127.0.0.1:5173', // Vite alternative
  'http://127.0.0.1:8000', // React alternative
];
if (frontendUrl) {
  allowedOrigins.push(frontendUrl); // Add frontend URL from .env if present
}
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;

// Auth endpoint
app.post('/api/auth/login', async (req, res) => {
  const { login_id, password } = req.body;
  if (!login_id || !password) return res.status(400).json({ error: 'login_id and password required' });
  try {
    const company = await getCompanyByLoginId(login_id);
    if (!company) return res.status(401).json({ error: 'Invalid login_id or password' });
    // Plain text password check
    if (password !== company.password) {
      return res.status(401).json({ error: 'Invalid login_id or password' });
    }
    // Issue JWT with company info
    const token = jwt.sign({ company_id: company.login_id, db_url: company.db_url }, JWT_SECRET, { expiresIn: '12h' });
    // Store the token in the database for single-session enforcement
    await require('./database').mainPool.query('UPDATE companies SET current_token = $1 WHERE login_id = $2', [token, login_id]);
    res.json({ token, company_name: company.company_name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auth verify endpoint for sensitive unlock
app.post('/api/auth/verify', async (req, res) => {
  const { login_id, password } = req.body;
  if (!login_id || !password) return res.status(400).json({ valid: false, error: 'login_id and password required' });
  try {
    const company = await getCompanyByLoginId(login_id);
    if (!company) return res.status(200).json({ valid: false });
    if (password !== company.password) {
      return res.status(200).json({ valid: false });
    }
    res.json({ valid: true });
  } catch (err) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

// Auth middleware
async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing or invalid token' });
  try {
    const token = auth.replace('Bearer ', '');
    const payload = jwt.verify(token, JWT_SECRET);
    // Check if the token matches the one stored in the database
    const result = await require('./database').mainPool.query('SELECT current_token FROM companies WHERE login_id = $1', [payload.company_id]);
    if (!result.rows[0] || result.rows[0].current_token !== token) {
      return res.status(401).json({ error: 'Session invalidated. You have logged in from another device.' });
    }
    req.company = payload;
    req.dbPool = getDbPoolByUrl(payload.db_url);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware to ensure company tables exist (auto-create on first login/API call)
async function ensureTablesMiddleware(req, res, next) {
  try {
    await ensureCompanyTables(req.company.db_url);
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to ensure company tables', details: err.message });
  }
}

// Protected API routes
app.use('/api/products', requireAuth, ensureTablesMiddleware, productsRouter);
app.use('/api/transactions', requireAuth, ensureTablesMiddleware, transactionsRouter);
app.use('/api/customers', requireAuth, ensureTablesMiddleware, customersRouter);
app.use('/api/vendors', requireAuth, ensureTablesMiddleware, vendorsRouter);

app.get('/', (req, res) => {
  res.json({
    message: 'Inventory Management API is running!',
    endpoints: {
      auth_login: 'POST /api/auth/login',
      products: 'GET/POST/PUT/DELETE /api/products',
      transactions: 'GET/POST /api/transactions',
      customers: 'GET/POST/PUT/DELETE /api/customers',
      vendors: 'GET/POST/PUT/DELETE /api/vendors'
    }
  });
});

const PORT = process.env.PORT || 4000;

setupCompaniesTable().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}); 