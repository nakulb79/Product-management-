# Shop Management System - Quick Start Guide

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## First Steps

### 1. Add Your First Product
- Click the "Products" tab
- Click "+ Add Product" button
- Fill in the details:
  - Name: e.g., "Laptop"
  - Description: Optional description
  - Price: Selling price
  - Cost: Your cost (for profit tracking)
  - Category: e.g., "Electronics"
  - Initial Stock: Starting inventory
  - Min Stock Alert: Low stock threshold
- Click "Save Product"

### 2. Manage Stock Levels
- Click the "Stock Management" tab
- View all products with their current stock levels
- Products below minimum stock are highlighted in red
- Click "Update" to adjust stock levels, locations, or thresholds

### 3. Record a Payment
- Click the "Payments" tab
- Click "+ Add Payment"
- Enter payment details:
  - Amount
  - Payment Method (Cash, Card, UPI, etc.)
  - Customer information (optional)
  - Payment Status
- Click "Save Payment"

### 4. Create a Delivery
- Click the "Deliveries" tab
- Click "+ Add Delivery"
- Enter customer details:
  - Name and Address (required)
  - Phone number
  - Delivery date
  - Tracking number (optional)
- Select products and quantities
  - Check the product boxes
  - Enter quantity for each
  - System validates against available stock
- Click "Create Delivery"
- Stock is automatically reduced

### 5. Track Deliveries
- View delivery status in the Deliveries tab
- Update status as delivery progresses:
  - **Pending** → Click "Ship" → **In Transit**
  - **In Transit** → Click "Delivered" → **Delivered**

## Dashboard Overview

The dashboard shows:
- **Total Products**: Number of products in your catalog
- **Low Stock Items**: Products below minimum threshold (highlighted in red)
- **Pending Payments**: Payments awaiting completion
- **Pending Deliveries**: Deliveries awaiting shipment
- **Total Revenue**: Sum of all completed payments

## Tips

1. **Set Realistic Min Stock**: Configure minimum stock levels to get alerts before running out
2. **Use Categories**: Organize products by category for easier management
3. **Track Locations**: Use the location field to manage multiple warehouses
4. **Low Stock Warnings**: Pay attention to red warnings - they indicate critical stock levels
5. **Order IDs**: Use consistent order ID format for better tracking
6. **Customer Data**: Record customer information for better service and analytics

## API Access

The system provides REST API endpoints if you want to integrate with other systems:

- Products: `/api/products`
- Stock: `/api/stock`
- Payments: `/api/payments`
- Deliveries: `/api/deliveries`
- Dashboard: `/api/dashboard`

See README.md for complete API documentation.

## Data Backup

Your data is stored in `shop_management.db` file. To backup:
```bash
cp shop_management.db shop_management_backup_$(date +%Y%m%d).db
```

## Troubleshooting

**Q: I can't create a delivery**
A: Check if you have sufficient stock. The system prevents deliveries that would result in negative inventory.

**Q: Low stock warning won't go away**
A: Update the stock quantity to be above the minimum threshold, or adjust the minimum threshold in Stock Management.

**Q: Can I delete a product?**
A: Yes, but be careful - this will also remove all associated stock records.

**Q: How do I change payment information?**
A: Click on the Payments tab and use the actions to update payment status or details.

## Support

For issues or questions, refer to the main README.md or check the project repository.
