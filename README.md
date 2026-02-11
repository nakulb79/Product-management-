# Shop Management System

A comprehensive application for shop owners to automate their shop management operations including product tracking, stock management, payments, and deliveries.

## Features

### 📦 Product Management
- Add, edit, and delete products
- Track product details (name, description, price, cost, category)
- View all products with stock levels
- Category-based organization

### 📊 Stock Management
- Real-time inventory tracking
- Low stock alerts
- Configurable minimum and maximum stock levels
- Multiple warehouse locations support
- Automatic stock updates on deliveries

### 💰 Payment Management
- Record all payment transactions
- Multiple payment methods (Cash, Card, UPI, Bank Transfer)
- Track payment status (Pending, Completed, Failed)
- Customer information tracking
- Revenue analytics

### 🚚 Delivery Management
- Create and track deliveries
- Customer address and contact information
- Delivery status tracking (Pending, In Transit, Delivered)
- Order tracking numbers
- Automatic stock deduction on delivery creation
- Multi-product deliveries

### 📈 Dashboard
- Overview of key metrics
- Total products count
- Low stock items alert
- Pending payments summary
- Pending deliveries count
- Total revenue tracking

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite3 (lightweight, file-based database)
- **Frontend**: Vanilla JavaScript with modern CSS
- **Architecture**: RESTful API

## Installation

1. **Prerequisites**
   - Node.js (v14 or higher)
   - npm (Node Package Manager)

2. **Clone the repository**
   ```bash
   git clone https://github.com/nakulb79/Product-management-.git
   cd Product-management-
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start the application**
   ```bash
   npm start
   ```

5. **Access the application**
   Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage Guide

### Adding Products

1. Navigate to the **Products** tab
2. Click the **"+ Add Product"** button
3. Fill in the product details:
   - Name (required)
   - Description
   - Price (required)
   - Cost (required)
   - Category
   - Initial Stock
   - Minimum Stock Alert level
4. Click **"Save Product"**

### Managing Stock

1. Navigate to the **Stock Management** tab
2. View current stock levels for all products
3. Click **"Update"** on any product to modify:
   - Current quantity
   - Minimum quantity (low stock alert threshold)
   - Maximum quantity
   - Storage location
4. Low stock items are highlighted in red with a warning icon

### Recording Payments

1. Navigate to the **Payments** tab
2. Click **"+ Add Payment"**
3. Enter payment details:
   - Order ID (optional)
   - Amount (required)
   - Payment Method (required)
   - Payment Status
   - Customer information
   - Notes
4. Mark payments as "Completed" when processed

### Managing Deliveries

1. Navigate to the **Deliveries** tab
2. Click **"+ Add Delivery"**
3. Enter delivery information:
   - Customer name and address (required)
   - Contact phone
   - Delivery date
   - Tracking number
4. Select products and quantities for delivery
5. Click **"Create Delivery"**
6. Track delivery status:
   - **Pending** → Click "Ship" to mark as **In Transit**
   - **In Transit** → Click "Delivered" when complete

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Stock
- `GET /api/stock` - Get all stock items
- `GET /api/stock/alerts/low` - Get low stock items
- `PUT /api/stock/:productId` - Update stock

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/:id` - Get single payment
- `GET /api/payments/stats/summary` - Get payment statistics
- `POST /api/payments` - Create payment
- `PUT /api/payments/:id` - Update payment status

### Deliveries
- `GET /api/deliveries` - Get all deliveries
- `GET /api/deliveries/:id` - Get single delivery
- `GET /api/deliveries/stats/summary` - Get delivery statistics
- `POST /api/deliveries` - Create delivery
- `PUT /api/deliveries/:id` - Update delivery status

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics

## Database Schema

The application uses SQLite with the following tables:

- **products** - Product information
- **stock** - Inventory levels and locations
- **payments** - Payment transactions
- **deliveries** - Delivery orders
- **delivery_items** - Items in each delivery

## Configuration

You can customize the application by setting environment variables:

```bash
PORT=3000  # Default port (optional)
```

## Development

To run the application in development mode:

```bash
npm run dev
```

## Production Deployment

For production deployment:

1. Set the PORT environment variable
2. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name shop-management
   ```

## Security Considerations

- The database file (`shop_management.db`) is excluded from version control
- Input validation is performed on all API endpoints
- Consider adding authentication for production use
- Use HTTPS in production environments

## Future Enhancements

- User authentication and role-based access
- Multi-user support
- Export data to Excel/CSV
- Advanced reporting and analytics
- Email notifications for low stock
- Invoice generation
- Barcode scanning support
- Mobile app integration

## Support

For issues, questions, or contributions, please visit:
https://github.com/nakulb79/Product-management-

## License

ISC
 
