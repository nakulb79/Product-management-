const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Helper function to promisify database operations
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// ===== PRODUCTS API =====

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await dbAll(`
      SELECT p.*, s.quantity as stock_quantity, s.min_quantity, s.location
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      ORDER BY p.created_at DESC
    `);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await dbGet(`
      SELECT p.*, s.quantity as stock_quantity, s.min_quantity, s.max_quantity, s.location
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE p.id = ?
    `, [req.params.id]);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const { name, description, price, cost, category, initial_stock = 0, min_quantity = 10, location = 'Main Warehouse' } = req.body;
    
    if (!name || !price || !cost) {
      return res.status(400).json({ error: 'Name, price, and cost are required' });
    }

    if (price <= 0 || cost <= 0) {
      return res.status(400).json({ error: 'Price and cost must be positive numbers' });
    }

    if (price < cost) {
      return res.status(400).json({ error: 'Warning: Price is less than cost. This will result in losses.' });
    }

    const productId = uuidv4();
    const stockId = uuidv4();

    await dbRun(
      'INSERT INTO products (id, name, description, price, cost, category) VALUES (?, ?, ?, ?, ?, ?)',
      [productId, name, description, price, cost, category]
    );

    await dbRun(
      'INSERT INTO stock (id, product_id, quantity, min_quantity, location) VALUES (?, ?, ?, ?, ?)',
      [stockId, productId, initial_stock, min_quantity, location]
    );

    const product = await dbGet('SELECT * FROM products WHERE id = ?', [productId]);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, description, price, cost, category } = req.body;
    
    if (price <= 0 || cost <= 0) {
      return res.status(400).json({ error: 'Price and cost must be positive numbers' });
    }

    const result = await dbRun(
      'UPDATE products SET name = ?, description = ?, price = ?, cost = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description, price, cost, category, req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await dbGet('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM stock WHERE product_id = ?', [req.params.id]);
    await dbRun('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== STOCK API =====

// Get all stock items
app.get('/api/stock', async (req, res) => {
  try {
    const stock = await dbAll(`
      SELECT s.*, p.name as product_name, p.price, p.category
      FROM stock s
      JOIN products p ON s.product_id = p.id
      ORDER BY s.updated_at DESC
    `);
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update stock quantity
app.put('/api/stock/:productId', async (req, res) => {
  try {
    const { quantity, min_quantity, max_quantity, location } = req.body;
    
    await dbRun(
      'UPDATE stock SET quantity = ?, min_quantity = ?, max_quantity = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
      [quantity, min_quantity, max_quantity, location, req.params.productId]
    );

    const stock = await dbGet('SELECT * FROM stock WHERE product_id = ?', [req.params.productId]);
    res.json(stock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get low stock items
app.get('/api/stock/alerts/low', async (req, res) => {
  try {
    const lowStock = await dbAll(`
      SELECT s.*, p.name as product_name, p.category
      FROM stock s
      JOIN products p ON s.product_id = p.id
      WHERE s.quantity <= s.min_quantity
      ORDER BY s.quantity ASC
    `);
    res.json(lowStock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== PAYMENTS API =====

// Get all payments
app.get('/api/payments', async (req, res) => {
  try {
    const payments = await dbAll('SELECT * FROM payments ORDER BY payment_date DESC');
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single payment
app.get('/api/payments/:id', async (req, res) => {
  try {
    const payment = await dbGet('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create payment
app.post('/api/payments', async (req, res) => {
  try {
    const { order_id, amount, payment_method, payment_status, customer_name, customer_email, notes } = req.body;
    
    if (!amount || !payment_method) {
      return res.status(400).json({ error: 'Amount and payment method are required' });
    }

    const paymentId = uuidv4();
    
    await dbRun(
      'INSERT INTO payments (id, order_id, amount, payment_method, payment_status, customer_name, customer_email, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [paymentId, order_id, amount, payment_method, payment_status || 'pending', customer_name, customer_email, notes]
    );

    const payment = await dbGet('SELECT * FROM payments WHERE id = ?', [paymentId]);
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update payment
app.put('/api/payments/:id', async (req, res) => {
  try {
    const { amount, payment_method, payment_status, customer_name, customer_email, notes } = req.body;
    
    await dbRun(
      'UPDATE payments SET amount = COALESCE(?, amount), payment_method = COALESCE(?, payment_method), payment_status = COALESCE(?, payment_status), customer_name = COALESCE(?, customer_name), customer_email = COALESCE(?, customer_email), notes = COALESCE(?, notes) WHERE id = ?',
      [amount, payment_method, payment_status, customer_name, customer_email, notes, req.params.id]
    );

    const payment = await dbGet('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment statistics
app.get('/api/payments/stats/summary', async (req, res) => {
  try {
    const stats = await dbGet(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN payment_status = 'completed' THEN amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        AVG(amount) as average_payment
      FROM payments
    `);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== DELIVERIES API =====

// Get all deliveries
app.get('/api/deliveries', async (req, res) => {
  try {
    const deliveries = await dbAll(`
      SELECT d.*, 
        GROUP_CONCAT(p.name || ' (x' || di.quantity || ')') as items
      FROM deliveries d
      LEFT JOIN delivery_items di ON d.id = di.delivery_id
      LEFT JOIN products p ON di.product_id = p.id
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `);
    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single delivery
app.get('/api/deliveries/:id', async (req, res) => {
  try {
    const delivery = await dbGet('SELECT * FROM deliveries WHERE id = ?', [req.params.id]);
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    const items = await dbAll(`
      SELECT di.*, p.name as product_name, p.price
      FROM delivery_items di
      JOIN products p ON di.product_id = p.id
      WHERE di.delivery_id = ?
    `, [req.params.id]);
    
    delivery.items = items;
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create delivery
app.post('/api/deliveries', async (req, res) => {
  try {
    const { order_id, customer_name, customer_address, customer_phone, delivery_date, tracking_number, items, notes } = req.body;
    
    if (!customer_name || !customer_address || !items || items.length === 0) {
      return res.status(400).json({ error: 'Customer name, address, and items are required' });
    }

    const deliveryId = uuidv4();
    
    await dbRun(
      'INSERT INTO deliveries (id, order_id, customer_name, customer_address, customer_phone, delivery_date, tracking_number, notes, delivery_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [deliveryId, order_id, customer_name, customer_address, customer_phone, delivery_date, tracking_number, notes, 'pending']
    );

    // Add delivery items and update stock
    for (const item of items) {
      // Check if sufficient stock exists
      const stock = await dbGet('SELECT quantity FROM stock WHERE product_id = ?', [item.product_id]);
      
      if (!stock) {
        return res.status(400).json({ error: `Product ${item.product_id} not found in stock` });
      }
      
      if (stock.quantity < item.quantity) {
        const product = await dbGet('SELECT name FROM products WHERE id = ?', [item.product_id]);
        return res.status(400).json({ 
          error: `Insufficient stock for ${product ? product.name : 'product'}. Available: ${stock.quantity}, Requested: ${item.quantity}` 
        });
      }

      const itemId = uuidv4();
      await dbRun(
        'INSERT INTO delivery_items (id, delivery_id, product_id, quantity) VALUES (?, ?, ?, ?)',
        [itemId, deliveryId, item.product_id, item.quantity]
      );
      
      // Reduce stock
      await dbRun(
        'UPDATE stock SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
        [item.quantity, item.product_id]
      );
    }

    const delivery = await dbGet('SELECT * FROM deliveries WHERE id = ?', [deliveryId]);
    res.status(201).json(delivery);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update delivery status
app.put('/api/deliveries/:id', async (req, res) => {
  try {
    const { delivery_status, delivery_date, tracking_number, notes } = req.body;
    
    await dbRun(
      'UPDATE deliveries SET delivery_status = ?, delivery_date = ?, tracking_number = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [delivery_status, delivery_date, tracking_number, notes, req.params.id]
    );

    const delivery = await dbGet('SELECT * FROM deliveries WHERE id = ?', [req.params.id]);
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get delivery statistics
app.get('/api/deliveries/stats/summary', async (req, res) => {
  try {
    const stats = await dbGet(`
      SELECT 
        COUNT(*) as total_deliveries,
        SUM(CASE WHEN delivery_status = 'pending' THEN 1 ELSE 0 END) as pending_deliveries,
        SUM(CASE WHEN delivery_status = 'in_transit' THEN 1 ELSE 0 END) as in_transit,
        SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END) as completed_deliveries
      FROM deliveries
    `);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== DASHBOARD API =====

app.get('/api/dashboard', async (req, res) => {
  try {
    const productCount = await dbGet('SELECT COUNT(*) as count FROM products');
    const lowStock = await dbGet('SELECT COUNT(*) as count FROM stock WHERE quantity <= min_quantity');
    const pendingPayments = await dbGet('SELECT COUNT(*) as count, SUM(amount) as total FROM payments WHERE payment_status = "pending"');
    const pendingDeliveries = await dbGet('SELECT COUNT(*) as count FROM deliveries WHERE delivery_status = "pending"');
    const totalRevenue = await dbGet('SELECT SUM(amount) as total FROM payments WHERE payment_status = "completed"');

    res.json({
      products: productCount.count,
      low_stock_items: lowStock.count,
      pending_payments: pendingPayments.count,
      pending_payments_amount: pendingPayments.total || 0,
      pending_deliveries: pendingDeliveries.count,
      total_revenue: totalRevenue.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Shop Management System running on http://localhost:${PORT}`);
});

module.exports = app;
