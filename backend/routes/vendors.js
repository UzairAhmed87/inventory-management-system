const express = require('express');
const router = express.Router();
const { getDbPool } = require('../database');

// Get all vendors for a company
router.get('/', async (req, res) => {
  const pool = req.dbPool;
  try {
    const result = await pool.query('SELECT * FROM vendors ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single vendor
router.get('/:id', async (req, res) => {
  const pool = req.dbPool;
  const { id } = req.params;
  
  try {
    const result = await pool.query('SELECT * FROM vendors WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new vendor
router.post('/', async (req, res) => {
  const pool = req.dbPool;
  const { name, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'Vendor name is required' });
  try {
    const result = await pool.query(
      `INSERT INTO vendors (name, phone) VALUES ($1, $2) RETURNING *`,
      [name, phone]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a vendor
router.put('/:id', async (req, res) => {
  const pool = req.dbPool;
  const { id } = req.params;
  const { name, phone } = req.body;
  try {
    const result = await pool.query(
      `UPDATE vendors SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone)
      WHERE id = $3 RETURNING *`,
      [name, phone, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a vendor
router.delete('/:id', async (req, res) => {
  const pool = req.dbPool;
  const { id } = req.params;
  
  try {
    // Check if vendor has any transactions
    const transactionCheck = await pool.query('SELECT COUNT(*) FROM transactions WHERE vendor_id = $1', [id]);
    if (parseInt(transactionCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete vendor with existing transactions' });
    }
    
    const result = await pool.query('DELETE FROM vendors WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 