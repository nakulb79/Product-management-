import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Product } from '../models/Product';
import { StockAdjustment } from '../models/StockAdjustment';
import { toErrorMessage } from '../utils/errors';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

export const createStockAdjustment = async (req: AuthenticatedRequest, res: Response) => {
  const { productId, quantityChange, reason, notes } = req.body;

  if (!productId) return res.status(400).json({ error: 'productId is required' });
  const delta = Number(quantityChange);
  if (!delta || Number.isNaN(delta)) {
    return res.status(400).json({ error: 'quantityChange must be a non-zero number' });
  }
  if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await Product.findById(productId).session(session);
    if (!product) throw new Error('Product not found');

    const nextStock = product.stock + delta;
    if (nextStock < 0) {
      throw new Error('Stock cannot go below zero');
    }

    product.stock = nextStock;
    await product.save({ session });

    const [adjustment] = await StockAdjustment.create(
      [
        {
          productId: product._id,
          quantityChange: delta,
          reason,
          notes: typeof notes === 'string' ? notes.trim() : '',
          createdBy: req.user.id
        }
      ],
      { session }
    );

    await session.commitTransaction();

    const populated = await StockAdjustment.findById(adjustment._id)
      .populate('productId', 'name sku stock')
      .populate('createdBy', 'name email');

    res.status(201).json(populated);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: toErrorMessage(error, 'Unable to create stock adjustment') });
  } finally {
    session.endSession();
  }
};

export const getStockAdjustments = async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);

  const [items, total] = await Promise.all([
    StockAdjustment.find()
      .sort({ createdAt: -1 })
      .populate('productId', 'name sku stock')
      .populate('createdBy', 'name email')
      .skip(skip)
      .limit(limit),
    StockAdjustment.countDocuments()
  ]);

  res.json({
    data: items,
    pagination: buildPaginationMeta(page, limit, total)
  });
};
