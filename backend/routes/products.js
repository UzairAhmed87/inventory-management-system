const express = require('express');
const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  const pool = req.dbPool;
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /stock-report?date=YYYY-MM-DD - Stock report as of a date
router.get('/stock-report', async (req, res) => {
  const pool = req.dbPool;
  try {
    const query = `SELECT name as product_name, quantity as stock FROM products ORDER BY name`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single product
router.get('/:id', async (req, res) => {
  const pool = req.dbPool;
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new product
router.post('/', async (req, res) => {
  const pool = req.dbPool;
  const { name, quantity } = req.body;
  if (!name) return res.status(400).json({ error: 'Product name is required' });
  try {
    const result = await pool.query(`
      INSERT INTO products (name, quantity)
      VALUES ($1, $2)
      RETURNING *
    `, [name, quantity || 0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ error: 'Product name must be unique' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update a product
router.put('/:id', async (req, res) => {
  const pool = req.dbPool;
  const { id } = req.params;
  const { name, quantity } = req.body;
  try {
    const result = await pool.query(`
      UPDATE products 
      SET name = COALESCE($1, name),
          quantity = COALESCE($2, quantity)
      WHERE id = $3
      RETURNING *
    `, [name, quantity, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ error: 'Product name must be unique' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Delete a product
router.delete('/:id', async (req, res) => {
  const pool = req.dbPool;
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 