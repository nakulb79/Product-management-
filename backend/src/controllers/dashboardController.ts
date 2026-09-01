import { Request, Response } from 'express';
import { Delivery } from '../models/Delivery';
import { Payment } from '../models/Payment';
import { Product } from '../models/Product';
import { Sale } from '../models/Sale';

export const getDashboard = async (_req: Request, res: Response) => {
  const [products, lowStock, pendingPaymentsAgg, pendingDeliveries, salesRevenueAgg] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ $expr: { $lte: ['$stock', '$lowStockThreshold'] }, status: 'active' }),
    Payment.aggregate([
      { $match: { paymentStatus: 'pending' } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } }
    ]),
    Delivery.countDocuments({ deliveryStatus: 'pending' }),
    // Revenue must come from Sale (the actual POS record), not the unrelated Payment
    // collection, otherwise this number won't match /api/analytics/profit or reality.
    Sale.aggregate([{ $match: { voided: { $ne: true } } }, { $group: { _id: null, total: { $sum: '$grossRevenue' } } }])
  ]);

  const pendingPaymentsAmount = pendingPaymentsAgg[0]?.total ?? 0;
  const pendingPaymentsCount = pendingPaymentsAgg[0]?.count ?? 0;

  res.json({
    products,
    lowStock,
    pendingPayments: pendingPaymentsCount,
    pendingPaymentsAmount,
    pendingDeliveries,
    totalRevenue: salesRevenueAgg[0]?.total ?? 0
  });
};
