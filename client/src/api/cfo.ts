import api from './client';
import type {
  CfoClient, CfoInvoice, CfoTransaction, CfoExpense,
  CfoBudgetTarget, BudgetActual, CfoTaxPayment, TaxEstimate, CfoDashboard,
} from '@contractor-cfo/shared';

// Dashboard
export const getDashboard = (year?: number, priorYearTax?: number) =>
  api.get<CfoDashboard>('/cfo/dashboard', { params: { year, priorYearTax } }).then(r => r.data);

// Clients
export const getClients = (archived?: boolean) =>
  api.get<CfoClient[]>('/cfo/clients', { params: { archived } }).then(r => r.data);
export const getClient = (id: number) =>
  api.get<CfoClient>(`/cfo/clients/${id}`).then(r => r.data);
export const createClient = (body: Partial<CfoClient>) =>
  api.post<CfoClient>('/cfo/clients', body).then(r => r.data);
export const updateClient = (id: number, body: Partial<CfoClient>) =>
  api.put<CfoClient>(`/cfo/clients/${id}`, body).then(r => r.data);
export const archiveClient = (id: number) =>
  api.patch<CfoClient>(`/cfo/clients/${id}/archive`).then(r => r.data);

// Invoices
export const getInvoices = (params?: { status?: string; clientId?: number; year?: number }) =>
  api.get<CfoInvoice[]>('/cfo/invoices', { params }).then(r => r.data);
export const getInvoice = (id: number) =>
  api.get<CfoInvoice>(`/cfo/invoices/${id}`).then(r => r.data);
export const createInvoice = (body: Partial<CfoInvoice> & { lineItems?: { description: string; quantity: number; unitPrice: number }[] }) =>
  api.post<CfoInvoice>('/cfo/invoices', body).then(r => r.data);
export const updateInvoice = (id: number, body: Partial<CfoInvoice>) =>
  api.put<CfoInvoice>(`/cfo/invoices/${id}`, body).then(r => r.data);
export const markInvoiceSent = (id: number) =>
  api.patch<CfoInvoice>(`/cfo/invoices/${id}/send`).then(r => r.data);
export const voidInvoice = (id: number) =>
  api.patch<CfoInvoice>(`/cfo/invoices/${id}/void`).then(r => r.data);

// Transactions
export const getTransactions = (params?: { year?: number; invoiceId?: number }) =>
  api.get<CfoTransaction[]>('/cfo/transactions', { params }).then(r => r.data);
export const createTransaction = (body: Partial<CfoTransaction>) =>
  api.post<CfoTransaction>('/cfo/transactions', body).then(r => r.data);

// Expenses
export const getExpenses = (params?: { year?: number; month?: number; category?: string; deductible?: boolean; personal?: boolean }) =>
  api.get<CfoExpense[]>('/cfo/expenses', { params }).then(r => r.data);
export const createExpense = (body: Partial<CfoExpense>) =>
  api.post<CfoExpense>('/cfo/expenses', body).then(r => r.data);
export const updateExpense = (id: number, body: Partial<CfoExpense>) =>
  api.put<CfoExpense>(`/cfo/expenses/${id}`, body).then(r => r.data);
export const deleteExpense = (id: number) =>
  api.delete(`/cfo/expenses/${id}`);

// Budget
export const getBudgetTargets = (yearMonth?: string) =>
  api.get<CfoBudgetTarget[]>('/cfo/budget', { params: { yearMonth } }).then(r => r.data);
export const setBudgetTargets = (targets: { yearMonth: string; category: string; targetAmount: number }[]) =>
  api.put<CfoBudgetTarget[]>('/cfo/budget', targets).then(r => r.data);
export const getBudgetActuals = (yearMonth: string) =>
  api.get<BudgetActual[]>('/cfo/budget/actuals', { params: { yearMonth } }).then(r => r.data);

// Taxes
export const getTaxEstimate = (params?: { year?: number; priorYearTax?: number; otherIncome?: number }) =>
  api.get<TaxEstimate>('/cfo/taxes/estimate', { params }).then(r => r.data);
export const getTaxPayments = (year?: number) =>
  api.get<CfoTaxPayment[]>('/cfo/taxes/payments', { params: { year } }).then(r => r.data);
export const createTaxPayment = (body: Partial<CfoTaxPayment>) =>
  api.post<CfoTaxPayment>('/cfo/taxes/payments', body).then(r => r.data);
export const updateTaxPayment = (id: number, body: Partial<CfoTaxPayment>) =>
  api.put<CfoTaxPayment>(`/cfo/taxes/payments/${id}`, body).then(r => r.data);

// Auth / Tokens
export const getTokens = () =>
  api.get('/tokens').then(r => r.data);
export const createToken = (name: string, expiresAt?: string) =>
  api.post('/tokens', { name, expiresAt }).then(r => r.data);
export const deleteToken = (id: number) =>
  api.delete(`/tokens/${id}`);

// Household
export const getHousehold = () =>
  api.get('/household').then(r => r.data);
export const updateHousehold = (body: { name?: string; stateRate?: number | null; filingStatus?: string }) =>
  api.put('/household', body).then(r => r.data);
export const inviteMember = (email: string) =>
  api.post('/household/invite', { email }).then(r => r.data);
