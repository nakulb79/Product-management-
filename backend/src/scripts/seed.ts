import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { connectDb } from '../config/db';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { hashPassword } from '../utils/auth';

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const seed = async () => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
      console.error(
        'Refusing to run: NODE_ENV=production. This script creates a well-known demo admin account ' +
          '(admin@example.com / password123). Set ALLOW_SEED=true if you really intend to run this against production.'
      );
      process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI not found in .env');
      process.exit(1);
    }

    console.log('Connecting to database...');
    await connectDb(mongoUri);

    // 1. Create Users
    console.log('Creating users...');
    const adminEmail = 'admin@example.com';
    const staffEmail = 'staff@example.com';
    const password = 'password123';
    const hashedPassword = await hashPassword(password);

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: 'Admin User',
        email: adminEmail,
        password: hashedPassword,
        role: 'owner',
        isActive: true
      });
      console.log('Admin user created.');
    } else {
      console.log('Admin user already exists.');
    }

    let staff = await User.findOne({ email: staffEmail });
    if (!staff) {
      staff = await User.create({
        name: 'Staff Member',
        email: staffEmail,
        password: hashedPassword,
        role: 'staff',
        isActive: true
      });
      console.log('Staff user created.');
    } else {
      console.log('Staff user already exists.');
    }

    // 2. Create Categories
    console.log('Creating categories...');
    const categoriesData = [
      { name: 'Electronics', slug: 'electronics' },
      { name: 'Groceries', slug: 'groceries' },
      { name: 'Clothing', slug: 'clothing' }
    ];

    const categories: any[] = [];
    for (const cat of categoriesData) {
      let category = await Category.findOne({ slug: cat.slug });
      if (!category) {
        category = await Category.create({
          ...cat,
          createdBy: admin._id
        });
        console.log(`Category ${cat.name} created.`);
      }
      categories.push(category);
    }

    // 3. Create Products
    console.log('Creating products...');
    const productsData = [
      {
        name: 'Smartphone X',
        sku: 'SM-X-001',
        barcode: '123456789012',
        price: 45000,
        costPrice: 35000,
        category: categories[0]._id,
        stock: 15,
        lowStockThreshold: 5,
        createdBy: admin._id
      },
      {
        name: 'Laptop Pro',
        sku: 'LT-P-002',
        barcode: '987654321098',
        price: 85000,
        costPrice: 70000,
        category: categories[0]._id,
        stock: 8,
        lowStockThreshold: 3,
        createdBy: admin._id
      },
      {
        name: 'Organic Milk 1L',
        sku: 'MK-001',
        barcode: '112233445566',
        price: 80,
        costPrice: 60,
        category: categories[1]._id,
        stock: 50,
        lowStockThreshold: 10,
        createdBy: admin._id
      },
      {
        name: 'T-Shirt Cotton',
        sku: 'TS-001',
        barcode: '665544332211',
        price: 500,
        costPrice: 300,
        category: categories[2]._id,
        stock: 100,
        lowStockThreshold: 20,
        createdBy: admin._id
      }
    ];

    for (const prod of productsData) {
      const existingProd = await Product.findOne({ sku: prod.sku });
      if (!existingProd) {
        await Product.create(prod);
        console.log(`Product ${prod.name} created.`);
      }
    }

    console.log('-----------------------------------');
    console.log('Seeding completed successfully!');
    console.log('Demo Credentials:');
    console.log(`Admin: ${adminEmail} / ${password}`);
    console.log(`Staff: ${staffEmail} / ${password}`);
    console.log('-----------------------------------');

  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
