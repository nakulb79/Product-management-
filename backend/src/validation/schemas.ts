import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const nonEmptyString = z.string().trim().min(1);
const optionalString = z.string().trim().optional();
const nonNegativeNumber = z.coerce.number().min(0);

// Auth

export const registerSchema = z
  .object({
    name: nonEmptyString,
    email: z.string().trim().email(),
    password: z.string().min(6),
    role: z.enum(['owner', 'staff']).optional()
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(1)
  })
  .strict();

// Categories

export const createCategorySchema = z
  .object({
    name: nonEmptyString,
    slug: nonEmptyString,
    description: optionalString,
    parent: objectId.nullable().optional(),
    status: z.enum(['active', 'inactive']).optional()
  })
  .strict();

// Products

const productFields = {
  name: nonEmptyString,
  sku: optionalString,
  barcode: optionalString,
  description: optionalString,
  price: nonNegativeNumber,
  costPrice: nonNegativeNumber,
  category: objectId,
  stock: nonNegativeNumber.optional(),
  lowStockThreshold: nonNegativeNumber.optional(),
  images: z.array(z.string()).optional(),
  expiryDate: z.coerce.date().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional()
};

export const createProductSchema = z.object(productFields).strict();

export const updateProductSchema = z.object(productFields).partial().strict();

export const bulkImportProductsSchema = z
  .object({
    items: z.array(z.object(productFields).strict()).min(1)
  })
  .strict();

// Sales

const saleItemSchema = z
  .object({
    productId: objectId,
    quantity: z.coerce.number().min(1),
    lineDiscount: z.coerce.number().min(0).optional()
  })
  .strict();

export const createSaleSchema = z
  .object({
    items: z.array(saleItemSchema).min(1),
    paymentMethod: z.enum(['cash', 'upi', 'card']),
    gstRate: z.coerce.number().min(0).optional(),
    discount: z.coerce.number().min(0).optional(),
    customerName: optionalString,
    customerPhone: optionalString,
    notes: optionalString
  })
  .strict();

export const voidSaleSchema = z
  .object({
    reason: optionalString
  })
  .strict();

// Payments

export const createPaymentSchema = z
  .object({
    orderId: optionalString,
    amount: nonNegativeNumber,
    paymentMethod: nonEmptyString,
    customerName: optionalString,
    customerEmail: z.union([z.literal(''), z.string().trim().email()]).optional(),
    notes: optionalString
  })
  .strict();

export const updatePaymentSchema = z
  .object({
    orderId: optionalString,
    amount: nonNegativeNumber.optional(),
    paymentMethod: nonEmptyString.optional(),
    customerName: optionalString,
    customerEmail: z.union([z.literal(''), z.string().trim().email()]).optional(),
    notes: optionalString,
    paymentStatus: z.enum(['pending', 'completed', 'failed']).optional()
  })
  .strict();

// Deliveries

const deliveryItemSchema = z
  .object({
    productId: objectId,
    quantity: z.coerce.number().min(1)
  })
  .strict();

export const createDeliverySchema = z
  .object({
    orderId: optionalString,
    customerName: nonEmptyString,
    customerAddress: nonEmptyString,
    customerPhone: optionalString,
    deliveryDate: z.coerce.date().optional(),
    trackingNumber: optionalString,
    notes: optionalString,
    items: z.array(deliveryItemSchema).min(1)
  })
  .strict();

export const updateDeliverySchema = z
  .object({
    orderId: optionalString,
    customerName: optionalString,
    customerAddress: optionalString,
    customerPhone: optionalString,
    deliveryDate: z.coerce.date().optional(),
    trackingNumber: optionalString,
    notes: optionalString,
    items: z.array(deliveryItemSchema).min(1).optional(),
    deliveryStatus: z.enum(['pending', 'in_transit', 'delivered']).optional()
  })
  .strict();

// Purchases

const purchaseItemSchema = z
  .object({
    productId: objectId,
    quantity: z.coerce.number().min(1),
    costPrice: nonNegativeNumber
  })
  .strict();

export const createPurchaseSchema = z
  .object({
    supplierName: nonEmptyString,
    items: z.array(purchaseItemSchema).min(1),
    purchaseDate: z.coerce.date().optional()
  })
  .strict();

// Expenses

export const createExpenseSchema = z
  .object({
    title: nonEmptyString,
    category: z.enum(['rent', 'utilities', 'salary', 'transport', 'misc', 'other']).optional(),
    amount: nonNegativeNumber,
    expenseDate: z.coerce.date().optional(),
    notes: optionalString
  })
  .strict();

// Stock adjustments

export const createStockAdjustmentSchema = z
  .object({
    productId: objectId,
    quantityChange: z.coerce.number().refine((n) => n !== 0, 'quantityChange must be a non-zero number'),
    reason: z.enum(['damaged', 'expired', 'count_correction', 'theft', 'return', 'other']).optional(),
    notes: optionalString
  })
  .strict();
