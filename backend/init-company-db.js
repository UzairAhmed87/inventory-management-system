require('dotenv').config();
const { mainPool, initializeCompanyTables } = require('./database');

async function run() {
  const loginId = process.argv[2];
  if (!loginId) {
    console.error('Usage: node init-company-db.js <login_id>');
    process.exit(1);
  }
  const result = await mainPool.query('SELECT db_url FROM companies WHERE login_id = $1', [loginId]);
  if (result.rowCount === 0) {
    console.error('No such company:', loginId);
    process.exit(1);
  }
  const dbUrl = result.rows[0].db_url;
  await initializeCompanyTables(dbUrl);
  process.exit(0);
}

run(); 