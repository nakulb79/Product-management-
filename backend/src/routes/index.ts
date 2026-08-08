import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  bulkImportProducts,
  updateProduct,
  deleteProduct,
  getLowStockProducts
} from '../controllers/productsController';
import { getPayments, createPayment, updatePayment } from '../controllers/paymentsController';
import { createCategory, getCategories, getCategoryById, updateCategory } from '../controllers/categoriesController';
import { getDeliveries, createDelivery, updateDelivery } from '../controllers/deliveriesController';
import { createSale, getSales, getSaleById, getDailySalesSummary, getWeeklySalesSummary, getSaleInvoice, voidSale } from '../controllers/salesController';
import { getDashboard } from '../controllers/dashboardController';
import { createPurchase, getPurchases } from '../controllers/purchasesController';
import { getProfitSummary } from '../controllers/analyticsController';
import { createExpense, getExpenses } from '../controllers/expensesController';
import { createStockAdjustment, getStockAdjustments } from '../controllers/stockAdjustmentsController';
import authRouter from './authRoutes';
import { authorizeRoles, requireAuth } from '../middleware/authMiddleware';
import { validateBody, validateObjectId } from '../middleware/validate';
import {
  bulkImportProductsSchema,
  createCategorySchema,
  createDeliverySchema,
  createExpenseSchema,
  createPaymentSchema,
  createProductSchema,
  createPurchaseSchema,
  createSaleSchema,
  createStockAdjustmentSchema,
  updateCategorySchema,
  updateDeliverySchema,
  updatePaymentSchema,
  updateProductSchema,
  voidSaleSchema
} from '../validation/schemas';

const asyncHandler =
  (fn: any) =>
  (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const router = Router();

router.use('/auth', authRouter);
router.use(asyncHandler(requireAuth));

router.get('/products', asyncHandler(getProducts));
router.post('/products', asyncHandler(authorizeRoles('owner')), validateBody(createProductSchema), asyncHandler(createProduct));
router.post(
  '/products/bulk-import',
  asyncHandler(authorizeRoles('owner')),
  validateBody(bulkImportProductsSchema),
  asyncHandler(bulkImportProducts)
);
router.get('/products/:id', validateObjectId('id'), asyncHandler(getProductById));
router.put(
  '/products/:id',
  asyncHandler(authorizeRoles('owner')),
  validateObjectId('id'),
  validateBody(updateProductSchema),
  asyncHandler(updateProduct)
);
router.delete('/products/:id', asyncHandler(authorizeRoles('owner')), validateObjectId('id'), asyncHandler(deleteProduct));
router.get('/stock/alerts/low', asyncHandler(getLowStockProducts));

router.post('/categories', asyncHandler(authorizeRoles('owner')), validateBody(createCategorySchema), asyncHandler(createCategory));
router.get('/categories', asyncHandler(getCategories));
router.get('/categories/:id', validateObjectId('id'), asyncHandler(getCategoryById));
router.put(
  '/categories/:id',
  asyncHandler(authorizeRoles('owner')),
  validateObjectId('id'),
  validateBody(updateCategorySchema),
  asyncHandler(updateCategory)
);

router.post('/sales', asyncHandler(authorizeRoles('owner', 'staff')), validateBody(createSaleSchema), asyncHandler(createSale));
router.get('/sales', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getSales));
router.get('/sales/summary/daily', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getDailySalesSummary));
router.get('/sales/summary/weekly', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getWeeklySalesSummary));
router.get('/sales/:id/invoice', asyncHandler(authorizeRoles('owner', 'staff')), validateObjectId('id'), asyncHandler(getSaleInvoice));
router.post(
  '/sales/:id/void',
  asyncHandler(authorizeRoles('owner')),
  validateObjectId('id'),
  validateBody(voidSaleSchema),
  asyncHandler(voidSale)
);
router.get('/sales/:id', asyncHandler(authorizeRoles('owner', 'staff')), validateObjectId('id'), asyncHandler(getSaleById));

router.get('/payments', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getPayments));
router.post(
  '/payments',
  asyncHandler(authorizeRoles('owner', 'staff')),
  validateBody(createPaymentSchema),
  asyncHandler(createPayment)
);
router.put(
  '/payments/:id',
  asyncHandler(authorizeRoles('owner', 'staff')),
  validateObjectId('id'),
  validateBody(updatePaymentSchema),
  asyncHandler(updatePayment)
);

router.get('/deliveries', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getDeliveries));
router.post(
  '/deliveries',
  asyncHandler(authorizeRoles('owner', 'staff')),
  validateBody(createDeliverySchema),
  asyncHandler(createDelivery)
);
router.put(
  '/deliveries/:id',
  asyncHandler(authorizeRoles('owner', 'staff')),
  validateObjectId('id'),
  validateBody(updateDeliverySchema),
  asyncHandler(updateDelivery)
);

router.get('/dashboard', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getDashboard));
router.get('/analytics/profit', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getProfitSummary));

router.post(
  '/purchases',
  asyncHandler(authorizeRoles('owner')),
  validateBody(createPurchaseSchema),
  asyncHandler(createPurchase)
);
router.get('/purchases', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getPurchases));

router.post(
  '/expenses',
  asyncHandler(authorizeRoles('owner', 'staff')),
  validateBody(createExpenseSchema),
  asyncHandler(createExpense)
);
router.get('/expenses', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getExpenses));

router.post(
  '/stock-adjustments',
  asyncHandler(authorizeRoles('owner', 'staff')),
  validateBody(createStockAdjustmentSchema),
  asyncHandler(createStockAdjustment)
);
router.get('/stock-adjustments', asyncHandler(authorizeRoles('owner', 'staff')), asyncHandler(getStockAdjustments));

export default router;
