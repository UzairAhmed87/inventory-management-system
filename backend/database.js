require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Main DB for companies/auth
const mainPool = new Pool({
  connectionString: process.env.MAIN_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Multi-tenant company DBs
const pools = {};
function getDbPoolByUrl(dbUrl) {
  if (!dbUrl) throw new Error('Missing dbUrl');
  if (!pools[dbUrl]) {
    pools[dbUrl] = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  }
  return pools[dbUrl];
}

// Create companies table and seed a test company (plain password)
async function setupCompaniesTable() {
  await mainPool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      login_id VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      db_url TEXT NOT NULL,
      current_token TEXT
    )
  `);
  // Seed a test company if not exists
  const loginId = 'company1';
  const password = 'test1234';
  const dbUrl = process.env.COMPANY1_DB_URL;
  const exists = await mainPool.query('SELECT 1 FROM companies WHERE login_id = $1', [loginId]);
  if (exists.rowCount === 0 && dbUrl) {
    await mainPool.query('INSERT INTO companies (login_id, password, db_url, current_token) VALUES ($1, $2, $3, NULL)', [loginId, password, dbUrl]);
    console.log('Seeded test company: company1 / test1234');
  }
}

async function getCompanyByLoginId(loginId) {
  const result = await mainPool.query('SELECT * FROM companies WHERE login_id = $1', [loginId]);
  return result.rows[0];
}

// Function to initialize the products table for a company
async function initializeProductsTable(companyId) {
  const pool = getDbPoolByUrl(companyId);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      quantity INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log(`Products table ensured for company: ${companyId}`);
}

// Function to initialize minimal company tables with new requirements
async function initializeCompanyTables(dbUrl) {
  const pool = getDbPoolByUrl(dbUrl);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      quantity INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(50) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS vendors (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(50) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      type VARCHAR(20) NOT NULL,
      customer_name VARCHAR(255),
      vendor_name VARCHAR(255),
      total_amount NUMERIC(12,2) NOT NULL,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS transaction_items (
      id SERIAL PRIMARY KEY,
      transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      product_name VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL,
      price NUMERIC(12,2) NOT NULL,
      total_price NUMERIC(12,2) NOT NULL
    );
    CREATE TABLE IF NOT EXISTS balance_payments (
      id SERIAL PRIMARY KEY,
      type VARCHAR(20) NOT NULL CHECK (type IN ('customer_payment', 'vendor_payment')),
      customer_name VARCHAR(255),
      vendor_name VARCHAR(255),
      amount NUMERIC(12,2) NOT NULL,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      previous_balance NUMERIC(12,2),
      new_balance NUMERIC(12,2)
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      amount NUMERIC(12,2) NOT NULL,
      description TEXT NOT NULL,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('All tables ensured for company DB:', dbUrl);
}

// Helper to check if all tables exist, and auto-create if missing
async function ensureCompanyTables(dbUrl) {
  const pool = getDbPoolByUrl(dbUrl);
  // Check for one table as a proxy (products)
  const res = await pool.query(`SELECT to_regclass('public.products') as exists`);
  if (!res.rows[0].exists) {
    await initializeCompanyTables(dbUrl);
  }
}

if (require.main === module) {
  initializeProductsTable().then(() => process.exit()).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { mainPool, getDbPoolByUrl, setupCompaniesTable, getCompanyByLoginId, initializeProductsTable, initializeCompanyTables, ensureCompanyTables }; 