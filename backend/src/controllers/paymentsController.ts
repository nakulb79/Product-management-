import { Request, Response } from 'express';
import { Payment } from '../models/Payment';
import { pick } from '../utils/pick';

// paymentStatus is deliberately excluded on create — a payment always starts 'pending'
// (schema default) so a caller can't mark itself 'completed' at creation time.
const CREATE_FIELDS = ['orderId', 'amount', 'paymentMethod', 'customerName', 'customerEmail', 'notes'] as const;
const UPDATE_FIELDS = [...CREATE_FIELDS, 'paymentStatus'] as const;

export const getPayments = async (_req: Request, res: Response) => {
  const payments = await Payment.find().sort({ createdAt: -1 });
  res.json(payments);
};

export const createPayment = async (req: Request, res: Response) => {
  const { amount, paymentMethod } = req.body;
  if (amount === undefined || !paymentMethod) {
    return res.status(400).json({ error: 'Amount and paymentMethod are required' });
  }
  const payment = await Payment.create(pick(req.body, CREATE_FIELDS));
  res.status(201).json(payment);
};

export const updatePayment = async (req: Request, res: Response) => {
  const payment = await Payment.findByIdAndUpdate(req.params.id, pick(req.body, UPDATE_FIELDS), {
    new: true,
    runValidators: true
  });
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json(payment);
};
