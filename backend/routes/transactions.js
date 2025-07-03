const express = require('express');
const router = express.Router();
const { getDbPool } = require('../database');

// Get all transactions for a company
router.get('/', async (req, res) => {
  const pool = req.dbPool;
  try {
    // Get all transactions with their items (product name, quantity, price, total_price)
    const transactionsResult = await pool.query(`
      SELECT t.*, 
        json_agg(json_build_object('product_name', ti.product_name, 'quantity', ti.quantity, 'price', ti.price, 'totalPrice', ti.total_price)) AS items
      FROM transactions t
      LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
      GROUP BY t.id
      ORDER BY t.date DESC
    `);
    res.json(transactionsResult.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /payments - Record a payment
router.post('/payments', async (req, res) => {
  const pool = req.dbPool;
  const { type, customer_name, vendor_name, amount, date, notes } = req.body;
  if (!type || !['customer_payment', 'vendor_payment'].includes(type)) {
    return res.status(400).json({ error: 'Valid payment type is required' });
  }
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }
  let previousBalance = 0;
  let newBalance = 0;
  let invoice_number = generatePaymentInvoiceNumber(type);
  try {
    await pool.query('BEGIN');
    if (type === 'customer_payment' && customer_name) {
      const customerResult = await pool.query('SELECT balance FROM customers WHERE name = $1', [customer_name]);
      previousBalance = Number(customerResult.rows[0]?.balance || 0);
      newBalance = previousBalance - Number(amount);
      if (newBalance < 0) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Payment exceeds outstanding balance' });
      }
      await pool.query('UPDATE customers SET balance = $1 WHERE name = $2', [newBalance, customer_name]);
    } else if (type === 'vendor_payment' && vendor_name) {
      const vendorResult = await pool.query('SELECT balance FROM vendors WHERE name = $1', [vendor_name]);
      previousBalance = Number(vendorResult.rows[0]?.balance || 0);
      newBalance = previousBalance - Number(amount);
      if (newBalance < 0) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Payment exceeds outstanding balance' });
      }
      await pool.query('UPDATE vendors SET balance = $1 WHERE name = $2', [newBalance, vendor_name]);
    } else {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Customer or vendor name required' });
    }
    // Insert payment record
    const paymentResult = await pool.query(
      `INSERT INTO balance_payments (type, customer_name, vendor_name, amount, date, notes, invoice_number, previous_balance, new_balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [type, customer_name || null, vendor_name || null, amount, date || new Date(), notes || '', invoice_number, previousBalance, newBalance]
    );
    await pool.query('COMMIT');
    res.status(201).json(paymentResult.rows[0]);
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// GET /payments - List all payments
router.get('/payments', async (req, res) => {
  const pool = req.dbPool;
  try {
    const result = await pool.query('SELECT * FROM balance_payments ORDER BY date DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /expenses - List all expenses
router.get('/expenses', async (req, res) => {
  const pool = req.dbPool;
  try {
    const result = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /expenses - Add a new expense
router.post('/expenses', async (req, res) => {
  const pool = req.dbPool;
  const { amount, description, date } = req.body;
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }
  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO expenses (amount, description, date) VALUES ($1, $2, $3) RETURNING *',
      [amount, description, date || new Date()]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single transaction
router.get('/:id', async (req, res) => {
  const pool = req.dbPool;
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT t.*, 
             c.name as customer_name,
             v.name as vendor_name
      FROM transactions t
      LEFT JOIN customers c ON t.customer_name = c.name
      LEFT JOIN vendors v ON t.vendor_name = v.name
      WHERE t.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a transaction by invoice number
router.get('/invoice/:invoice_number', async (req, res) => {
  const pool = req.dbPool;
  const { invoice_number } = req.params;
  try {
    const result = await pool.query(`
      SELECT t.*, 
             c.name as customer_name,
             v.name as vendor_name,
             json_agg(json_build_object('product_name', ti.product_name, 'quantity', ti.quantity, 'price', ti.price, 'totalPrice', ti.total_price)) AS items
      FROM transactions t
      LEFT JOIN customers c ON t.customer_name = c.name
      LEFT JOIN vendors v ON t.vendor_name = v.name
      LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
      WHERE t.invoice_number = $1
      GROUP BY t.id, c.name, v.name
    `, [invoice_number]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    const transaction = result.rows[0];
    // Calculate and attach previousBalance and newBalance
    let previousBalance = 0;
    let newBalance = 0;
    if (transaction.type === 'sale' && transaction.customer_name) {
      const customerResult = await pool.query('SELECT balance FROM customers WHERE name = $1', [transaction.customer_name]);
      newBalance = Number(customerResult.rows[0]?.balance || 0);
      previousBalance = newBalance - Number(transaction.total_amount || 0);
    } else if (transaction.type === 'purchase' && transaction.vendor_name) {
      const vendorResult = await pool.query('SELECT balance FROM vendors WHERE name = $1', [transaction.vendor_name]);
      newBalance = Number(vendorResult.rows[0]?.balance || 0);
      previousBalance = newBalance - Number(transaction.total_amount || 0);
    } else if (transaction.type === 'return' && transaction.customer_name) {
      const customerResult = await pool.query('SELECT balance FROM customers WHERE name = $1', [transaction.customer_name]);
      newBalance = Number(customerResult.rows[0]?.balance || 0);
      previousBalance = newBalance + Number(transaction.total_amount || 0);
    } else if (transaction.type === 'return' && transaction.vendor_name) {
      const vendorResult = await pool.query('SELECT balance FROM vendors WHERE name = $1', [transaction.vendor_name]);
      newBalance = Number(vendorResult.rows[0]?.balance || 0);
      previousBalance = newBalance + Number(transaction.total_amount || 0);
    }
    transaction.previousBalance = previousBalance;
    transaction.newBalance = newBalance;
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to generate invoice number using DB function for atomic serial
async function generateInvoiceNumber(type, pool) {
  const prefix = type === 'sale' ? 'INV' : type === 'purchase' ? 'PUR' : 'RET';
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = String(now.getDate()).padStart(2, '0');
  // Get the next serial atomically from the DB
  const { rows } = await pool.query(
    'SELECT get_next_invoice_serial($1, $2, $3) AS serial',
    [prefix, year, month]
  );
  const serial = rows[0].serial;
  const invoice_number = `${prefix}${year}${String(month).padStart(2, '0')}${day}${serial}`;
  return invoice_number;
}

// Helper to generate payment invoice number
function generatePaymentInvoiceNumber(type) {
  const prefix = type === 'customer_payment' ? 'CPAY' : 'VPAY';
  const now = new Date();
  return (
    prefix +
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(Math.floor(Math.random() * 1000000)).padStart(6, '0')
  );
}

// Helper to convert snake_case keys to camelCase
function toCamel(obj) {
  if (!obj) return obj;
  const newObj = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
    newObj[camelKey] = obj[key];
  }
  return newObj;
}

// Create a new transaction
router.post('/', async (req, res) => {
  const pool = req.dbPool;
  const { type, customer_name, vendor_name, items } = req.body;
  if (!type || !['purchase', 'sale', 'return'].includes(type)) {
    return res.status(400).json({ error: 'Valid transaction type is required' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }
  // Calculate total_amount from items
  const total_amount = items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
  let previousBalance = 0;
  let newBalance = 0;
  try {
    await pool.query('BEGIN');
    // Calculate balances and update customer/vendor
    if (type === 'sale' && customer_name) {
      const customerResult = await pool.query('SELECT balance FROM customers WHERE name = $1', [customer_name]);
      previousBalance = Number(customerResult.rows[0]?.balance || 0);
      newBalance = previousBalance + Number(total_amount);
      await pool.query('UPDATE customers SET balance = $1 WHERE name = $2', [newBalance, customer_name]);
    } else if (type === 'purchase' && vendor_name) {
      const vendorResult = await pool.query('SELECT balance FROM vendors WHERE name = $1', [vendor_name]);
      previousBalance = Number(vendorResult.rows[0]?.balance || 0);
      newBalance = previousBalance + Number(total_amount);
      await pool.query('UPDATE vendors SET balance = $1 WHERE name = $2', [newBalance, vendor_name]);
    } else if (type === 'return' && customer_name) {
      const customerResult = await pool.query('SELECT balance FROM customers WHERE name = $1', [customer_name]);
      previousBalance = Number(customerResult.rows[0]?.balance || 0);
      newBalance = previousBalance - Number(total_amount);
      await pool.query('UPDATE customers SET balance = $1 WHERE name = $2', [newBalance, customer_name]);
    } else if (type === 'return' && vendor_name) {
      const vendorResult = await pool.query('SELECT balance FROM vendors WHERE name = $1', [vendor_name]);
      previousBalance = Number(vendorResult.rows[0]?.balance || 0);
      newBalance = previousBalance - Number(total_amount);
      await pool.query('UPDATE vendors SET balance = $1 WHERE name = $2', [newBalance, vendor_name]);
    }
    // Generate invoice number (serial per month)
    const invoice_number = await generateInvoiceNumber(type, pool);
    // Insert transaction (use customer_name and vendor_name)
    const transactionResult = await pool.query(
      `INSERT INTO transactions (invoice_number, type, customer_name, vendor_name, total_amount, date)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [invoice_number, type, customer_name, vendor_name, total_amount]
    );
    const transaction = transactionResult.rows[0];
    // Insert items and update product quantities
    for (const item of items) {
      // Find product by name
      const productResult = await pool.query('SELECT * FROM products WHERE name = $1', [item.productName]);
      if (productResult.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: `Product not found: ${item.productName}` });
      }
      const product = productResult.rows[0];
      // Insert item (only product_name)
      await pool.query(
        `INSERT INTO transaction_items (transaction_id, product_name, quantity, price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [transaction.id, product.name, item.quantity, item.price, item.totalPrice]
      );
      // Update product quantity
      let newQuantity = product.quantity;
      if (type === 'purchase') newQuantity += item.quantity;
      else if (type === 'sale') {
        if (product.quantity < item.quantity) {
          await pool.query('ROLLBACK');
          return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
        }
        newQuantity -= item.quantity;
      } else if (type === 'return') {
        newQuantity += item.quantity;
      }
      await pool.query('UPDATE products SET quantity = $1 WHERE name = $2', [newQuantity, product.name]);
    }
    await pool.query('COMMIT');
    // Fetch the full transaction with items for response
    const fullTransactionResult = await pool.query(`
      SELECT t.*, 
        json_agg(json_build_object('product_name', ti.product_name, 'quantity', ti.quantity, 'price', ti.price, 'totalPrice', ti.total_price)) AS items
      FROM transactions t
      LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
      WHERE t.id = $1
      GROUP BY t.id
    `, [transaction.id]);
    const fullTransaction = fullTransactionResult.rows[0];
    fullTransaction.previousBalance = Number(previousBalance);
    fullTransaction.newBalance = Number(newBalance);
    // Attach customer/vendor info if available
    if (fullTransaction.customer_name) {
      const customerResult = await pool.query('SELECT * FROM customers WHERE name = $1', [fullTransaction.customer_name]);
      fullTransaction.customer = customerResult.rows[0] || null;
    }
    if (fullTransaction.vendor_name) {
      const vendorResult = await pool.query('SELECT * FROM vendors WHERE name = $1', [fullTransaction.vendor_name]);
      fullTransaction.vendor = vendorResult.rows[0] || null;
    }
    res.status(201).json(toCamel(fullTransaction));
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// Get transaction summary/dashboard data
router.get('/summary/dashboard', async (req, res) => {
  const pool = req.dbPool;
  try {
    // Get total products
    const productsResult = await pool.query('SELECT COUNT(*) as total_products FROM products');
    // Get out of stock products
    const outOfStockResult = await pool.query('SELECT COUNT(*) as out_of_stock_count FROM products WHERE quantity = 0');
    // Get recent transactions with product names and quantities
    const recentTransactionsResult = await pool.query(`
      SELECT t.*, 
        json_agg(json_build_object('product_name', ti.product_name, 'quantity', ti.quantity)) AS items
      FROM transactions t
      LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
      GROUP BY t.id
      ORDER BY t.date DESC
      LIMIT 10
    `);
    // Get total inventory count
    const totalInventoryResult = await pool.query('SELECT SUM(quantity) as total_inventory FROM products WHERE quantity > 0');

    // Calculate current month sales, purchases, and cash in hand
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    // Transactions for current month
    const monthTransactionsResult = await pool.query(
      `SELECT * FROM transactions WHERE date >= $1 AND date < $2`,
      [monthStart, monthEnd]
    );
    const monthTransactions = monthTransactionsResult.rows;
    const current_month_sales = monthTransactions
      .filter(t => t.type === 'sale')
      .reduce((sum, t) => sum + Number(t.total_amount || 0), 0)
      - monthTransactions
      .filter(t => t.type === 'return')
      .reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
    const current_month_purchases = monthTransactions
      .filter(t => t.type === 'purchase')
      .reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
    // Payments for cash in hand
    const paymentsResult = await pool.query('SELECT * FROM balance_payments');
    const payments = paymentsResult.rows;
    const total_customer_payments = payments.filter(p => p.type === 'customer_payment').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const total_vendor_payments = payments.filter(p => p.type === 'vendor_payment').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    // Expenses for cash in hand
    const expensesResult = await pool.query('SELECT * FROM expenses');
    const expenses = expensesResult.rows;
    const total_expenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const cash_in_hand = total_customer_payments - total_vendor_payments - total_expenses;

    res.json({
      total_products: parseInt(productsResult.rows[0].total_products),
      low_stock_count: parseInt(outOfStockResult.rows[0].out_of_stock_count),
      recent_transactions: recentTransactionsResult.rows,
      total_inventory_value: parseInt(totalInventoryResult.rows[0].total_inventory || 0),
      current_month_sales,
      current_month_purchases,
      cash_in_hand
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /ledger/customer/:name - Customer ledger (transactions + payments)
router.get('/ledger/customer/:name', async (req, res) => {
  const pool = req.dbPool;
  const { name } = req.params;
  const { from, to } = req.query;
  try {
    // Fetch transactions for this customer
    let txQuery = `SELECT * FROM transactions WHERE customer_name = $1`;
    const params = [name];
    if (from) {
      txQuery += ' AND date >= $2';
      params.push(from);
    }
    if (to) {
      txQuery += from ? ' AND date <= $3' : ' AND date <= $2';
      params.push(to);
    }
    txQuery += ' ORDER BY date ASC';
    const txResult = await pool.query(txQuery, params);
    const transactions = txResult.rows;
    // Fetch transaction items for all transactions
    const txIds = transactions.map(t => t.id);
    let itemsByTx = {};
    if (txIds.length > 0) {
      const itemsResult = await pool.query(
        `SELECT * FROM transaction_items WHERE transaction_id = ANY($1::int[])`,
        [txIds]
      );
      itemsByTx = itemsResult.rows.reduce((acc, item) => {
        if (!acc[item.transaction_id]) acc[item.transaction_id] = [];
        acc[item.transaction_id].push(item);
        return acc;
      }, {});
    }
    // Fetch payments for this customer
    let payQuery = `SELECT * FROM balance_payments WHERE customer_name = $1 AND type = 'customer_payment'`;
    const payParams = [name];
    if (from) {
      payQuery += ' AND date >= $2';
      payParams.push(from);
    }
    if (to) {
      payQuery += from ? ' AND date <= $3' : ' AND date <= $2';
      payParams.push(to);
    }
    payQuery += ' ORDER BY date ASC';
    const payResult = await pool.query(payQuery, payParams);
    const payments = payResult.rows;
    // Merge and sort
    const entries = [
      ...transactions.map(t => {
        let productDesc = '';
        const items = itemsByTx[t.id] || [];
        if (items.length > 0) {
          productDesc = items.map(item => `${item.product_name} x ${item.quantity} @ ${Number(item.price).toFixed(2)}`).join(', ');
        }
        let desc = t.type === 'sale' ? `Sale Invoice: ${t.invoice_number}` : t.type === 'return' ? `Return Invoice: ${t.invoice_number}` : t.type;
        if (productDesc) desc += `\n${productDesc}`;
        return {
          date: t.date,
          type: t.type,
          description: desc,
          debit: t.type === 'sale' ? Number(t.total_amount) : 0,
          credit: t.type === 'return' ? Number(t.total_amount) : 0,
        };
      }),
      ...payments.map(p => ({
        date: p.date,
        type: 'payment',
        description: `Payment Invoice: ${p.invoice_number}${p.notes ? ' - ' + p.notes : ''}`,
        debit: 0,
        credit: Number(p.amount),
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    // Calculate running balance
    let runningBalance = 0;
    const ledger = entries.map(entry => {
      runningBalance = runningBalance + entry.debit - entry.credit;
      return { ...entry, balance: runningBalance };
    });
    res.json(ledger);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /ledger/vendor/:name - Vendor ledger (transactions + payments)
router.get('/ledger/vendor/:name', async (req, res) => {
  const pool = req.dbPool;
  const { name } = req.params;
  const { from, to } = req.query;
  try {
    // Fetch transactions for this vendor
    let txQuery = `SELECT * FROM transactions WHERE vendor_name = $1`;
    const params = [name];
    if (from) {
      txQuery += ' AND date >= $2';
      params.push(from);
    }
    if (to) {
      txQuery += from ? ' AND date <= $3' : ' AND date <= $2';
      params.push(to);
    }
    txQuery += ' ORDER BY date ASC';
    const txResult = await pool.query(txQuery, params);
    const transactions = txResult.rows;
    // Fetch transaction items for all transactions
    const txIds = transactions.map(t => t.id);
    let itemsByTx = {};
    if (txIds.length > 0) {
      const itemsResult = await pool.query(
        `SELECT * FROM transaction_items WHERE transaction_id = ANY($1::int[])`,
        [txIds]
      );
      itemsByTx = itemsResult.rows.reduce((acc, item) => {
        if (!acc[item.transaction_id]) acc[item.transaction_id] = [];
        acc[item.transaction_id].push(item);
        return acc;
      }, {});
    }
    // Fetch payments for this vendor
    let payQuery = `SELECT * FROM balance_payments WHERE vendor_name = $1 AND type = 'vendor_payment'`;
    const payParams = [name];
    if (from) {
      payQuery += ' AND date >= $2';
      payParams.push(from);
    }
    if (to) {
      payQuery += from ? ' AND date <= $3' : ' AND date <= $2';
      payParams.push(to);
    }
    payQuery += ' ORDER BY date ASC';
    const payResult = await pool.query(payQuery, payParams);
    const payments = payResult.rows;
    // Merge and sort
    const entries = [
      ...transactions.map(t => {
        let productDesc = '';
        const items = itemsByTx[t.id] || [];
        if (items.length > 0) {
          productDesc = items.map(item => `${item.product_name} x ${item.quantity} @ ${Number(item.price).toFixed(2)}`).join(', ');
        }
        let desc = t.type === 'purchase' ? `Purchase Invoice: ${t.invoice_number}` : t.type === 'return' ? `Return Invoice: ${t.invoice_number}` : t.type;
        if (productDesc) desc += `\n${productDesc}`;
        return {
          date: t.date,
          type: t.type,
          description: desc,
          debit: t.type === 'purchase' ? Number(t.total_amount) : 0,
          credit: t.type === 'return' ? Number(t.total_amount) : 0,
        };
      }),
      ...payments.map(p => ({
        date: p.date,
        type: 'payment',
        description: `Payment Invoice: ${p.invoice_number}${p.notes ? ' - ' + p.notes : ''}`,
        debit: 0,
        credit: Number(p.amount),
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    // Calculate running balance
    let runningBalance = 0;
    const ledger = entries.map(entry => {
      runningBalance = runningBalance + entry.debit - entry.credit;
      return { ...entry, balance: runningBalance };
    });
    res.json(ledger);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /:id - Update a transaction and its items
router.put('/:id', async (req, res) => {
  const pool = req.dbPool;
  const { id } = req.params;
  const { type, customer_name, vendor_name, items, total_amount, totalAmount } = req.body;
  const totalAmountValue = total_amount ?? totalAmount ?? 0;
  try {
    await pool.query('BEGIN');
    // Update transaction main fields
    await pool.query(
      `UPDATE transactions SET type = $1, customer_name = $2, vendor_name = $3, total_amount = $4 WHERE id = $5`,
      [type, customer_name, vendor_name, totalAmountValue, id]
    );
    // Delete old items
    await pool.query(`DELETE FROM transaction_items WHERE transaction_id = $1`, [id]);
    // Insert new items
    for (const item of items) {
      await pool.query(
        `INSERT INTO transaction_items (transaction_id, product_name, quantity, price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, item.productName, item.quantity, item.price, item.totalPrice]
      );
    }
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 