import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';
import { toErrorMessage } from '../utils/errors';

const makeInvoiceNumber = () => `INV-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

export const createSale = async (req: AuthenticatedRequest, res: Response) => {
  const { items, paymentMethod, gstRate = 0, discount = 0, customerName, customerPhone, notes } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one cart item is required' });
  }
  if (!['cash', 'upi', 'card'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'paymentMethod must be cash, upi or card' });
  }
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const saleItems = [] as any[];
    let subTotal = 0;
    let grossRevenue = 0;
    let cogs = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) throw new Error(`Product not found: ${item.productId}`);

      const quantity = Number(item.quantity || 0);
      if (!quantity || quantity < 1) throw new Error('Quantity must be at least 1');
      if (product.stock < quantity) throw new Error(`Insufficient stock for ${product.name}`);

      product.stock -= quantity;
      await product.save({ session });

      const unitPrice = product.price;
      const lineDiscount = Number(item.lineDiscount || 0);
      const lineTotal = Math.max(unitPrice * quantity - lineDiscount, 0);
      subTotal += lineTotal;

      const itemRevenue = unitPrice * quantity;
      const itemCogs = product.costPrice * quantity;
      const itemProfit = itemRevenue - itemCogs;

      grossRevenue += itemRevenue;
      cogs += itemCogs;

      saleItems.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        quantity,
        unitPrice,
        lineDiscount,
        lineTotal,
        costPriceAtSale: product.costPrice,
        itemRevenue,
        itemCogs,
        itemProfit
      });
    }

    const normalizedDiscount = Math.max(Number(discount || 0), 0);
    const taxableBase = Math.max(subTotal - normalizedDiscount, 0);
    const gstAmount = (taxableBase * Math.max(Number(gstRate || 0), 0)) / 100;
    const grandTotal = taxableBase + gstAmount;

    const grossProfit = grossRevenue - cogs;
    const margin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

    const sale = await Sale.create(
      [
        {
          invoiceNumber: makeInvoiceNumber(),
          customerName,
          customerPhone,
          items: saleItems,
          subTotal,
          discount: normalizedDiscount,
          gstRate: Number(gstRate || 0),
          gstAmount,
          grandTotal,
          grossRevenue,
          cogs,
          grossProfit,
          margin,
          paymentMethod,
          notes,
          createdBy: req.user.id
        }
      ],
      { session }
    );

    await session.commitTransaction();
    res.status(201).json(sale[0]);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: toErrorMessage(error, 'Unable to create sale') });
  } finally {
    session.endSession();
  }
};

export const getSales = async (req: AuthenticatedRequest, res: Response) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

  const [items, total] = await Promise.all([
    Sale.find().sort({ createdAt: -1 }).populate('createdBy', 'name').skip((page - 1) * limit).limit(limit),
    Sale.countDocuments()
  ]);

  res.json({
    data: items,
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) }
  });
};

export const getSaleById = async (req: AuthenticatedRequest, res: Response) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Sale not found' });
  res.json(sale);
};

export const voidSale = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale) throw new Error('Sale not found');
    if (sale.voided) throw new Error('This sale has already been voided');

    for (const item of sale.items) {
      const product = await Product.findById(item.productId).session(session);
      if (product) {
        product.stock += item.quantity;
        await product.save({ session });
      }
    }

    sale.voided = true;
    sale.voidedAt = new Date();
    sale.voidedBy = req.user.id as any;
    sale.voidReason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    await sale.save({ session });

    await session.commitTransaction();
    res.json(sale);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: toErrorMessage(error, 'Unable to void sale') });
  } finally {
    session.endSession();
  }
};

export const getDailySalesSummary = async (req: AuthenticatedRequest, res: Response) => {
  const dateParam = (req.query.date as string | undefined) || new Date().toISOString().slice(0, 10);
  const start = new Date(`${dateParam}T00:00:00.000Z`);
  const end = new Date(`${dateParam}T23:59:59.999Z`);

  const summary = await Sale.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, voided: { $ne: true } } },
    {
      $group: {
        _id: '$paymentMethod',
        totalAmount: { $sum: '$grandTotal' },
        totalGst: { $sum: '$gstAmount' },
        totalOrders: { $sum: 1 }
      }
    }
  ]);

  const totals = summary.reduce(
    (acc, row) => {
      acc.totalSales += row.totalAmount;
      acc.totalGst += row.totalGst;
      acc.totalOrders += row.totalOrders;
      acc.paymentBreakdown[row._id] = row.totalAmount;
      return acc;
    },
    { totalSales: 0, totalGst: 0, totalOrders: 0, paymentBreakdown: {} as Record<string, number> }
  );

  res.json({ date: dateParam, ...totals });
};

export const getWeeklySalesSummary = async (_req: AuthenticatedRequest, res: Response) => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 6); // Last 7 days including today
  start.setHours(0, 0, 0, 0);

  const summary = await Sale.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end }, voided: { $ne: true } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        totalAmount: { $sum: '$grandTotal' }
      }
    }
  ]);

  const summariesMap: Record<string, number> = {};
  for (const row of summary) {
    summariesMap[row._id] = row.totalAmount;
  }

  const summaries = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    summaries.push({
      date: dateStr,
      totalSales: summariesMap[dateStr] || 0
    });
  }

  res.json({ summaries });
};

export const getSaleInvoice = async (req: AuthenticatedRequest, res: Response) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Sale not found' });

  res.json({
    invoiceNumber: sale.invoiceNumber,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    createdAt: sale.createdAt,
    items: sale.items,
    subTotal: sale.subTotal,
    discount: sale.discount,
    gstRate: sale.gstRate,
    gstAmount: sale.gstAmount,
    grandTotal: sale.grandTotal,
    grossRevenue: sale.grossRevenue,
    cogs: sale.cogs,
    grossProfit: sale.grossProfit,
    margin: sale.margin,
    paymentMethod: sale.paymentMethod,
    notes: sale.notes,
    voided: sale.voided,
    voidedAt: sale.voidedAt,
    voidReason: sale.voidReason
  });
};
