import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Delivery } from '../models/Delivery';
import { Product } from '../models/Product';
import { toErrorMessage } from '../utils/errors';
import { pick } from '../utils/pick';

// deliveryStatus is deliberately excluded on create — a delivery always starts 'pending'
// (schema default) so a caller can't mark itself 'delivered' at creation time.
const CREATE_FIELDS = [
  'orderId',
  'customerName',
  'customerAddress',
  'customerPhone',
  'deliveryDate',
  'trackingNumber',
  'notes',
  'items'
] as const;
const UPDATE_FIELDS = [...CREATE_FIELDS, 'deliveryStatus'] as const;

export const getDeliveries = async (_req: Request, res: Response) => {
  const deliveries = await Delivery.find()
    .sort({ createdAt: -1 })
    .populate('items.productId', 'name');
  res.json(deliveries);
};

export const createDelivery = async (req: Request, res: Response) => {
  const { customerName, customerAddress, items } = req.body;
  if (!customerName || !customerAddress || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customerName, customerAddress and items are required' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) throw new Error('Product not found');
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      product.stock -= item.quantity;
      await product.save({ session });
    }

    const delivery = await Delivery.create([pick(req.body, CREATE_FIELDS)], { session });
    await session.commitTransaction();
    res.status(201).json(delivery[0]);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: toErrorMessage(error, 'Unable to create delivery') });
  } finally {
    session.endSession();
  }
};

export const updateDelivery = async (req: Request, res: Response) => {
  const delivery = await Delivery.findByIdAndUpdate(req.params.id, pick(req.body, UPDATE_FIELDS), {
    new: true,
    runValidators: true
  });
  if (!delivery) return res.status(404).json({ error: 'Delivery not found' });
  res.json(delivery);
};
