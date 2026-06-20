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

const router = Router();
router.use(authenticate);

// Dashboard
router.get('/dashboard', getDashboard);

// Clients
router.get('/clients', listClients);
router.get('/clients/:id', getClient);
router.post('/clients', createClient);
router.put('/clients/:id', updateClient);
router.patch('/clients/:id/archive', archiveClient);

// Invoices
router.get('/invoices', listInvoices);
router.get('/invoices/:id', getInvoice);
router.post('/invoices', createInvoice);
router.put('/invoices/:id', updateInvoice);
router.patch('/invoices/:id/send', markInvoiceSent);
router.patch('/invoices/:id/void', voidInvoice);
router.post('/invoices/:id/line-items', addLineItem);
router.put('/invoices/:id/line-items/:itemId', updateLineItem);
router.delete('/invoices/:id/line-items/:itemId', deleteLineItem);

// Transactions (income received)
router.get('/transactions', listTransactions);
router.post('/transactions', createTransaction);
router.put('/transactions/:id', updateTransaction);
router.delete('/transactions/:id', deleteTransaction);

// Expenses
router.get('/expenses', listExpenses);
router.post('/expenses', createExpense);
router.put('/expenses/:id', updateExpense);
router.delete('/expenses/:id', deleteExpense);

// Budget
router.get('/budget', getBudgetTargets);
router.put('/budget', upsertBudgetTargets);
router.get('/budget/actuals', getBudgetVsActuals);

// Taxes
router.get('/taxes/estimate', getTaxEstimate);
router.post('/taxes/estimate', getTaxEstimate);
router.get('/taxes/payments', listTaxPayments);
router.post('/taxes/payments', createTaxPayment);
router.put('/taxes/payments/:id', updateTaxPayment);
router.delete('/taxes/payments/:id', deleteTaxPayment);

export default router;
