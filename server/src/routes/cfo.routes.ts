import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { listClients, getClient, createClient, updateClient, archiveClient } from '../controllers/cfo/clients.controller';
import {
  listInvoices, getInvoice, createInvoice, updateInvoice,
  markInvoiceSent, voidInvoice, addLineItem, updateLineItem, deleteLineItem,
} from '../controllers/cfo/invoices.controller';
import { listTransactions, createTransaction, updateTransaction, deleteTransaction } from '../controllers/cfo/transactions.controller';
import { listExpenses, createExpense, updateExpense, deleteExpense } from '../controllers/cfo/expenses.controller';
import { getBudgetTargets, upsertBudgetTargets, getBudgetVsActuals } from '../controllers/cfo/budget.controller';
import { getTaxEstimate, listTaxPayments, createTaxPayment, updateTaxPayment, deleteTaxPayment } from '../controllers/cfo/taxes.controller';
import { getDashboard } from '../controllers/cfo/dashboard.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(authenticate);

// Dashboard
router.get('/dashboard', asyncHandler(getDashboard));

// Clients
router.get('/clients', asyncHandler(listClients));
router.get('/clients/:id', asyncHandler(getClient));
router.post('/clients', asyncHandler(createClient));
router.put('/clients/:id', asyncHandler(updateClient));
router.patch('/clients/:id/archive', asyncHandler(archiveClient));

// Invoices
router.get('/invoices', asyncHandler(listInvoices));
router.get('/invoices/:id', asyncHandler(getInvoice));
router.post('/invoices', asyncHandler(createInvoice));
router.put('/invoices/:id', asyncHandler(updateInvoice));
router.patch('/invoices/:id/send', asyncHandler(markInvoiceSent));
router.patch('/invoices/:id/void', asyncHandler(voidInvoice));
router.post('/invoices/:id/line-items', asyncHandler(addLineItem));
router.put('/invoices/:id/line-items/:itemId', asyncHandler(updateLineItem));
router.delete('/invoices/:id/line-items/:itemId', asyncHandler(deleteLineItem));

// Transactions (income received)
router.get('/transactions', asyncHandler(listTransactions));
router.post('/transactions', asyncHandler(createTransaction));
router.put('/transactions/:id', asyncHandler(updateTransaction));
router.delete('/transactions/:id', asyncHandler(deleteTransaction));

// Expenses
router.get('/expenses', asyncHandler(listExpenses));
router.post('/expenses', asyncHandler(createExpense));
router.put('/expenses/:id', asyncHandler(updateExpense));
router.delete('/expenses/:id', asyncHandler(deleteExpense));

// Budget
router.get('/budget', asyncHandler(getBudgetTargets));
router.put('/budget', asyncHandler(upsertBudgetTargets));
router.get('/budget/actuals', asyncHandler(getBudgetVsActuals));

// Taxes
router.get('/taxes/estimate', asyncHandler(getTaxEstimate));
router.post('/taxes/estimate', asyncHandler(getTaxEstimate));
router.get('/taxes/payments', asyncHandler(listTaxPayments));
router.post('/taxes/payments', asyncHandler(createTaxPayment));
router.put('/taxes/payments/:id', asyncHandler(updateTaxPayment));
router.delete('/taxes/payments/:id', asyncHandler(deleteTaxPayment));

export default router;
